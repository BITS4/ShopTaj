import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';
import { SmsService } from '../common/sms/sms.service';
import { BePaidService } from '../common/bepaid/bepaid.service';

export class CreatePaymentIntentDto {
  @ApiProperty() @IsUUID() addressId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingMethod?: string;
}

export class ConfirmOrderDto {
  @ApiProperty() @IsString() paymentIntentId: string;
  @ApiProperty() @IsString() addressId: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() shippingAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalAmount?: number;
}

export class BankTransferOrderDto {
  @ApiProperty() @IsString() addressId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
}

export class BePaidCreateDto {
  @ApiProperty() @IsString() addressId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
  @ApiProperty() @IsString() successUrl: string;
  @ApiProperty() @IsString() failUrl: string;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private email: EmailService,
    private sms: SmsService,
    private bepaid: BePaidService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });
  }

  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });

    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    let subtotal = cart.items.reduce((sum, item) => {
      const price = Number(item.variant?.price ?? item.product.discountPrice ?? item.product.price);
      return sum + price * item.quantity;
    }, 0);

    let discountAmount = 0;
    let couponId: string | null = null;

    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode } });
      if (coupon && coupon.isActive) {
        discountAmount = coupon.discountType === 'PERCENTAGE'
          ? (subtotal * Number(coupon.discountValue)) / 100
          : Number(coupon.discountValue);
        couponId = coupon.id;
      }
    }

    const shippingAmount = dto.shippingMethod === 'express' ? 15 : 5;
    const totalAmount = Math.max(0, subtotal - discountAmount) + shippingAmount;

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      metadata: { userId, addressId: dto.addressId, couponId: couponId || '' },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      subtotal,
      discountAmount,
      shippingAmount,
      totalAmount,
      couponId,
    };
  }

  async confirmOrder(userId: string, dto: ConfirmOrderDto) {
    this.logger.log(`confirmOrder called for user=${userId} pi=${dto.paymentIntentId}`);

    // Verify payment with Stripe
    const pi = await this.stripe.paymentIntents.retrieve(dto.paymentIntentId);
    this.logger.log(`PaymentIntent status: ${pi.status}`);

    if (pi.status !== 'succeeded') {
      throw new BadRequestException(`Payment not completed. Status: ${pi.status}`);
    }

    // Return existing order if already created (idempotency)
    const existing = await this.prisma.order.findFirst({
      where: { stripePaymentIntentId: dto.paymentIntentId },
      include: { items: true },
    });
    if (existing) {
      this.logger.log(`Order already exists: ${existing.id}`);
      // Still clear cart in case previous run failed mid-way
      const cart = await this.prisma.cart.findUnique({ where: { userId } });
      if (cart) await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      return existing;
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });

    if (!cart) throw new BadRequestException('Cart not found');

    // Allow empty cart here (user might have ordered, cart cleared, refreshed page)
    const cartItems = cart.items.length > 0 ? cart.items : [];

    const order = await this.prisma.order.create({
      data: {
        userId,
        shippingAddressId: dto.addressId || null,
        stripePaymentIntentId: dto.paymentIntentId,
        totalAmount: dto.totalAmount ?? pi.amount / 100,
        shippingAmount: dto.shippingAmount ?? 5,
        discountAmount: dto.discountAmount ?? 0,
        paymentStatus: 'PAID',
        status: 'PROCESSING',
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            priceAtPurchase: item.variant?.price ?? item.product.discountPrice ?? item.product.price,
            productName: item.product.name,
            productImage: null,
          })),
        },
      },
      include: { items: true },
    });

    this.logger.log(`Order created: ${order.id}`);

    // Reduce stock
    for (const item of cartItems) {
      if (item.variantId) {
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // Clear cart
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Send confirmation email + SMS (non-blocking)
    this.prisma.user.findUnique({ where: { id: userId } }).then((user) => {
      if (!user) return;
      this.email.sendOrderConfirmationEmail(user.email, user.fullName, order.id).catch(() => {});
      this.sms.sendOrderConfirmation(user.phone, order.id, `${Number(order.totalAmount).toFixed(2)} сом`).catch(() => {});
    });

    return order;
  }

  async createBankTransferOrder(userId: string, dto: BankTransferOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    let subtotal = cart.items.reduce((sum, item) => {
      const price = Number(item.variant?.price ?? item.product.discountPrice ?? item.product.price);
      return sum + price * item.quantity;
    }, 0);

    let discountAmount = 0;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode } });
      if (coupon && coupon.isActive) {
        discountAmount = coupon.discountType === 'PERCENTAGE'
          ? (subtotal * Number(coupon.discountValue)) / 100
          : Number(coupon.discountValue);
      }
    }

    const shippingAmount = dto.shippingMethod === 'express' ? 15 : 5;
    const totalAmount = Math.max(0, subtotal - discountAmount) + shippingAmount;

    const order = await this.prisma.order.create({
      data: {
        userId,
        shippingAddressId: dto.addressId,
        totalAmount,
        shippingAmount,
        discountAmount,
        paymentStatus: 'UNPAID',
        status: 'PENDING',
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            priceAtPurchase: item.variant?.price ?? item.product.discountPrice ?? item.product.price,
            productName: item.product.name,
            productImage: null,
          })),
        },
      },
    });

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    this.prisma.user.findUnique({ where: { id: userId } }).then((user) => {
      if (!user) return;
      this.email.sendOrderConfirmationEmail(user.email, user.fullName, order.id).catch(() => {});
      this.sms.sendOrderConfirmation(user.phone, order.id, `${Number(order.totalAmount).toFixed(2)} сом`).catch(() => {});
    });

    return { orderId: order.id, totalAmount, status: 'PENDING', paymentStatus: 'UNPAID' };
  }

  async createBePaidOrder(userId: string, dto: BePaidCreateDto) {
    if (!this.bepaid.isConfigured) {
      throw new BadRequestException('bePaid is not configured yet. Please contact the store admin.');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    let subtotal = cart.items.reduce((sum, item) => {
      const price = Number(item.variant?.price ?? item.product.discountPrice ?? item.product.price);
      return sum + price * item.quantity;
    }, 0);

    let discountAmount = 0;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode } });
      if (coupon && coupon.isActive) {
        discountAmount = coupon.discountType === 'PERCENTAGE'
          ? (subtotal * Number(coupon.discountValue)) / 100
          : Number(coupon.discountValue);
      }
    }

    const shippingAmount = dto.shippingMethod === 'express' ? 15 : 5;
    const totalAmount = Math.max(0, subtotal - discountAmount) + shippingAmount;

    // Create order as PENDING/UNPAID — confirmed when bepaid webhook fires
    const order = await this.prisma.order.create({
      data: {
        userId,
        shippingAddressId: dto.addressId,
        totalAmount,
        shippingAmount,
        discountAmount,
        paymentStatus: 'UNPAID',
        status: 'PENDING',
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            priceAtPurchase: item.variant?.price ?? item.product.discountPrice ?? item.product.price,
            productName: item.product.name,
            productImage: null,
          })),
        },
      },
    });

    // Clear cart immediately
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const notificationUrl = `${this.config.get('BACKEND_URL') || 'http://localhost:3001'}/api/payments/bepaid-webhook`;

    const checkout = await this.bepaid.createCheckout({
      orderId: order.id,
      amount: totalAmount,
      currency: this.config.get('BEPAID_CURRENCY') || 'USD',
      description: `ShopTaj Order #${order.id.slice(0, 8).toUpperCase()}`,
      customerEmail: user?.email || '',
      successUrl: `${dto.successUrl}?orderId=${order.id}`,
      failUrl: `${dto.failUrl}?orderId=${order.id}&failed=1`,
      notificationUrl,
    });

    return { orderId: order.id, redirectUrl: checkout.redirectUrl };
  }

  async handleBePaidWebhook(body: any) {
    const tx = body?.transaction;
    if (!tx) return { received: true };

    const orderId = tx.tracking_id;
    if (!orderId) return { received: true };

    if (tx.status === 'successful' && tx.payment?.status === 'successful') {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.paymentStatus === 'PAID') return { received: true };

      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PAID', status: 'PROCESSING' },
      });

      // Decrement stock
      const items = await this.prisma.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        if (item.variantId) {
          await this.prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity } } }).catch(() => {});
        } else {
          await this.prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } }).catch(() => {});
        }
      }

      const user = await this.prisma.user.findUnique({ where: { id: order.userId } });
      if (user) {
        this.email.sendOrderConfirmationEmail(user.email, user.fullName, orderId).catch(() => {});
        this.sms.sendOrderConfirmation(user.phone, orderId, `${Number(order.totalAmount).toFixed(2)} сом`).catch(() => {});
      }

      this.logger.log(`bePaid payment confirmed for order ${orderId}`);
    } else if (['failed', 'expired'].includes(tx.status)) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
      }).catch(() => {});
      this.logger.warn(`bePaid payment ${tx.status} for order ${orderId}`);
    }

    return { received: true };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret || webhookSecret === 'whsec_your_webhook_secret') {
      return { received: true };
    }
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const existing = await this.prisma.order.findFirst({ where: { stripePaymentIntentId: pi.id } });
      if (!existing) await this.fulfillOrder(pi);
    }
    return { received: true };
  }

  private async fulfillOrder(pi: Stripe.PaymentIntent) {
    const { userId, addressId } = pi.metadata;
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (!cart || cart.items.length === 0) return;

    const order = await this.prisma.order.create({
      data: {
        userId,
        shippingAddressId: addressId,
        stripePaymentIntentId: pi.id,
        totalAmount: pi.amount / 100,
        paymentStatus: 'PAID',
        status: 'PROCESSING',
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            priceAtPurchase: item.variant?.price ?? item.product.discountPrice ?? item.product.price,
            productName: item.product.name,
            productImage: null,
          })),
        },
      },
    });

    for (const item of cart.items) {
      if (item.variantId) {
        await this.prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity } } });
      } else {
        await this.prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) await this.email.sendOrderConfirmationEmail(user.email, user.fullName, order.id);
  }
}

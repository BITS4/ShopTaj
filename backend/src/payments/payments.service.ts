import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';

export class CreatePaymentIntentDto {
  @ApiProperty() @IsUUID() addressId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingMethod?: string;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private email: EmailService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });
  }

  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { product: true, variant: true } },
      },
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
        if (coupon.discountType === 'PERCENTAGE') {
          discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
        } else {
          discountAmount = Number(coupon.discountValue);
        }
        couponId = coupon.id;
      }
    }

    const shippingAmount = dto.shippingMethod === 'express' ? 15 : 5;
    const totalAmount = Math.max(0, subtotal - discountAmount) + shippingAmount;

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      metadata: { userId, addressId: dto.addressId },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      subtotal,
      discountAmount,
      shippingAmount,
      totalAmount,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      await this.fulfillOrder(pi);
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

    const totalAmount = pi.amount / 100;

    const order = await this.prisma.order.create({
      data: {
        userId,
        shippingAddressId: addressId,
        stripePaymentIntentId: pi.id,
        totalAmount,
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
      include: { items: true },
    });

    for (const item of cart.items) {
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

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.email.sendOrderConfirmationEmail(user.email, user.fullName, order.id);
    }
  }
}

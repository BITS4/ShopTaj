import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { BePaidService } from '../common/bepaid/bepaid.service';
import { EmailService } from '../common/email/email.service';
import { STRIPE_GATEWAY } from '../common/stripe/stripe.provider';
import { WhatsAppService } from '../common/whatsapp/whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const cart = {
    id: 'cart-1',
    items: [
      {
        productId: 'product-1',
        variantId: null,
        quantity: 2,
        product: {
          name: 'Tea',
          price: 10,
          discountPrice: 8,
        },
        variant: null,
      },
      {
        productId: 'product-2',
        variantId: 'variant-2',
        quantity: 2,
        product: {
          name: 'Spice',
          price: 6,
          discountPrice: null,
        },
        variant: { price: 4.5 },
      },
    ],
  };

  const prisma = {
    cart: { findUnique: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
    coupon: { findUnique: jest.fn() },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderItem: { findMany: jest.fn() },
    product: { update: jest.fn() },
    productVariant: { update: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const stripe = {
    constructWebhookEvent: jest.fn(),
    createPaymentIntent: jest.fn(),
    retrievePaymentIntent: jest.fn(),
  };
  const email = { sendOrderConfirmationEmail: jest.fn() };
  const whatsapp = { sendOrderConfirmation: jest.fn() };
  const bepaid = {
    createCheckout: jest.fn(),
    isConfigured: true,
  };
  const configValues: Record<string, string | undefined> = {};
  const config = {
    get: jest.fn((key: string) => configValues[key]),
  };
  const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };

  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    for (const key of Object.keys(configValues)) delete configValues[key];

    prisma.cart.findUnique.mockResolvedValue(cart);
    prisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });
    prisma.coupon.findUnique.mockResolvedValue(null);
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.order.findUnique.mockResolvedValue(null);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.product.update.mockResolvedValue({});
    prisma.productVariant.update.mockResolvedValue({});
    prisma.user.findUnique.mockResolvedValue(null);
    email.sendOrderConfirmationEmail.mockResolvedValue(undefined);
    whatsapp.sendOrderConfirmation.mockResolvedValue(undefined);
    bepaid.createCheckout.mockResolvedValue({
      token: 'checkout-token',
      redirectUrl: 'https://checkout.example/checkout-token',
    });
    bepaid.isConfigured = true;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: WhatsAppService, useValue: whatsapp },
        { provide: BePaidService, useValue: bepaid },
        { provide: STRIPE_GATEWAY, useValue: stripe },
        { provide: getLoggerToken(PaymentsService.name), useValue: logger },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe('createPaymentIntent', () => {
    it('calculates discounted line items and express shipping in minor units', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-1',
        isActive: true,
        discountType: 'PERCENTAGE',
        discountValue: 10,
      });
      stripe.createPaymentIntent.mockResolvedValue({
        id: 'pi_1',
        client_secret: 'pi_1_secret',
      });

      await expect(
        service.createPaymentIntent('user-1', {
          addressId: 'address-1',
          couponCode: 'SAVE10',
          shippingMethod: 'express',
        }),
      ).resolves.toEqual({
        clientSecret: 'pi_1_secret',
        paymentIntentId: 'pi_1',
        subtotal: 25,
        discountAmount: 2.5,
        shippingAmount: 15,
        totalAmount: 37.5,
        couponId: 'coupon-1',
      });

      expect(stripe.createPaymentIntent).toHaveBeenCalledWith({
        amount: 3750,
        currency: 'usd',
        metadata: {
          userId: 'user-1',
          addressId: 'address-1',
          couponId: 'coupon-1',
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          paymentIntentId: 'pi_1',
          amountMinor: 3750,
        },
        'Stripe payment intent created',
      );
    });

    it('rejects an empty cart before contacting Stripe', async () => {
      prisma.cart.findUnique.mockResolvedValue({ ...cart, items: [] });

      await expect(
        service.createPaymentIntent('user-1', { addressId: 'address-1' }),
      ).rejects.toThrow('Cart is empty');
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('ignores an inactive coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-1',
        isActive: false,
      });
      stripe.createPaymentIntent.mockResolvedValue({
        id: 'pi_2',
        client_secret: 'pi_2_secret',
      });

      const result = await service.createPaymentIntent('user-1', {
        addressId: 'address-1',
        couponCode: 'DISABLED',
      });

      expect(result).toEqual(
        expect.objectContaining({
          discountAmount: 0,
          couponId: null,
          totalAmount: 30,
        }),
      );
    });
  });

  describe('confirmOrder', () => {
    it('rejects a payment that has not succeeded', async () => {
      stripe.retrievePaymentIntent.mockResolvedValue({
        id: 'pi_pending',
        status: 'processing',
      });

      await expect(
        service.confirmOrder('user-1', {
          paymentIntentId: 'pi_pending',
          addressId: 'address-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('returns the existing order and clears the cart on an idempotent retry', async () => {
      const existingOrder = {
        id: 'order-existing',
        items: [{ id: 'item-1' }],
      };
      stripe.retrievePaymentIntent.mockResolvedValue({
        id: 'pi_existing',
        amount: 2500,
        status: 'succeeded',
      });
      prisma.order.findFirst.mockResolvedValue(existingOrder);
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' });

      await expect(
        service.confirmOrder('user-1', {
          paymentIntentId: 'pi_existing',
          addressId: 'address-1',
        }),
      ).resolves.toBe(existingOrder);

      expect(prisma.order.create).not.toHaveBeenCalled();
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
    });

    it('creates line items, decrements stock, and clears the cart once', async () => {
      const order = {
        id: 'order-1',
        totalAmount: 40,
        items: [{ id: 'order-item-1' }],
      };
      stripe.retrievePaymentIntent.mockResolvedValue({
        id: 'pi_success',
        amount: 4000,
        status: 'succeeded',
      });
      prisma.order.create.mockResolvedValue(order);

      await expect(
        service.confirmOrder('user-1', {
          paymentIntentId: 'pi_success',
          addressId: 'address-1',
        }),
      ).resolves.toBe(order);

      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          totalAmount: 40,
          paymentStatus: 'PAID',
          items: {
            create: [
              expect.objectContaining({
                productId: 'product-1',
                priceAtPurchase: 8,
                quantity: 2,
              }),
              expect.objectContaining({
                productId: 'product-2',
                variantId: 'variant-2',
                priceAtPurchase: 4.5,
              }),
            ],
          },
        }),
        include: { items: true },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { stock: { decrement: 2 } },
      });
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'variant-2' },
        data: { stock: { decrement: 2 } },
      });
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          orderId: 'order-1',
          paymentIntentId: 'pi_success',
        },
        'Paid order created',
      );
    });
  });

  describe('webhooks', () => {
    it('skips Stripe signature work when no webhook secret is configured', async () => {
      await expect(service.handleWebhook(Buffer.from('{}'), 'signature')).resolves.toEqual({
        received: true,
      });
      expect(stripe.constructWebhookEvent).not.toHaveBeenCalled();
    });

    it('rejects an invalid Stripe signature', async () => {
      configValues.STRIPE_WEBHOOK_SECRET = 'whsec_real_test_value';
      stripe.constructWebhookEvent.mockImplementation(() => {
        throw new Error('bad signature');
      });

      await expect(service.handleWebhook(Buffer.from('{}'), 'bad-signature')).rejects.toThrow(
        'Invalid webhook signature',
      );
    });

    it('processes a successful bePaid notification only once', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        paymentStatus: 'UNPAID',
        totalAmount: 25,
      };
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.order.update.mockResolvedValue({});
      prisma.orderItem.findMany.mockResolvedValue([
        {
          productId: 'product-1',
          variantId: null,
          quantity: 3,
        },
      ]);

      await expect(
        service.handleBePaidWebhook({
          transaction: {
            tracking_id: order.id,
            status: 'successful',
            payment: { status: 'successful' },
          },
        }),
      ).resolves.toEqual({ received: true });

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: order.id },
        data: { paymentStatus: 'PAID', status: 'PROCESSING' },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { stock: { decrement: 3 } },
      });
    });
  });

  it('fails clearly when bePaid checkout is not configured', async () => {
    bepaid.isConfigured = false;

    await expect(
      service.createBePaidOrder('user-1', {
        addressId: 'address-1',
        successUrl: 'https://shop.example/success',
        failUrl: 'https://shop.example/fail',
      }),
    ).rejects.toThrow('bePaid is not configured');
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});

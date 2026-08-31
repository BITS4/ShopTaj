import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  const prisma = {
    cart: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    cartItem: {
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    coupon: { findUnique: jest.fn() },
    couponUsage: { findUnique: jest.fn() },
    product: { findUnique: jest.fn() },
    productVariant: { findUnique: jest.fn() },
  };

  let service: CartService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CartService);
  });

  it('returns an empty summary when the user has no cart', async () => {
    prisma.cart.findUnique.mockResolvedValue(null);

    await expect(service.getCart('user-1')).resolves.toEqual({
      items: [],
      total: 0,
    });
  });

  it('calculates totals using variant and discounted prices', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          quantity: 2,
          product: { price: 10, discountPrice: 8 },
          variant: null,
        },
        {
          quantity: 3,
          product: { price: 20, discountPrice: null },
          variant: { price: 4.5 },
        },
      ],
    });

    await expect(service.getCart('user-1')).resolves.toEqual(
      expect.objectContaining({ total: 29.5 }),
    );
  });

  it('rejects adding an inactive or missing product', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(
      service.addItem('user-1', {
        productId: 'missing-product',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
  });

  it('checks variant stock before adding an item', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'product-1',
      isActive: true,
      stock: 20,
    });
    prisma.productVariant.findUnique.mockResolvedValue({ stock: 1 });

    await expect(
      service.addItem('user-1', {
        productId: 'product-1',
        variantId: 'variant-1',
        quantity: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.cart.findUnique).not.toHaveBeenCalled();
  });

  it('increments an existing line instead of creating a duplicate', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'product-1',
      isActive: true,
      stock: 20,
    });
    prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' });
    prisma.cartItem.findFirst.mockResolvedValue({
      id: 'item-1',
      quantity: 2,
    });
    prisma.cartItem.update.mockResolvedValue({ id: 'item-1', quantity: 5 });

    await service.addItem('user-1', {
      productId: 'product-1',
      quantity: 3,
    });

    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { quantity: 5 },
    });
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
  });

  it('treats a zero quantity update as removal', async () => {
    prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' });
    prisma.cartItem.findFirst.mockResolvedValue({
      id: 'item-1',
      cartId: 'cart-1',
    });
    prisma.cartItem.delete.mockResolvedValue({});

    await expect(
      service.updateItem('user-1', 'item-1', { quantity: 0 }),
    ).resolves.toEqual({ message: 'Item removed' });
    expect(prisma.cartItem.delete).toHaveBeenCalledWith({
      where: { id: 'item-1' },
    });
  });

  it('rejects an exhausted coupon and accepts an unused active coupon', async () => {
    const coupon = {
      id: 'coupon-1',
      isActive: true,
      expiresAt: null,
      maxUses: 2,
      usedCount: 2,
      discountType: 'FIXED',
      discountValue: 5,
      minOrderValue: 25,
    };
    prisma.coupon.findUnique.mockResolvedValue(coupon);

    await expect(service.applyCoupon('user-1', 'SAVE5')).rejects.toThrow(
      'Coupon exhausted',
    );

    prisma.coupon.findUnique.mockResolvedValue({
      ...coupon,
      usedCount: 1,
    });
    prisma.couponUsage.findUnique.mockResolvedValue(null);

    await expect(service.applyCoupon('user-1', 'SAVE5')).resolves.toEqual({
      couponId: 'coupon-1',
      discountType: 'FIXED',
      discountValue: 5,
      minOrderValue: 25,
    });
  });
});

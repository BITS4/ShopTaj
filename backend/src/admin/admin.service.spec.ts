import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DiscountType } from '@prisma/client';
import { validate } from 'class-validator';
import { CategoriesService } from '../categories/categories.service';
import { WhatsAppService } from '../common/whatsapp/whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { AdminService, CreateCouponDto } from './admin.service';

describe('AdminService', () => {
  const now = new Date('2026-08-31T10:30:00.000Z');
  const prisma = {
    coupon: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderItem: { groupBy: jest.fn() },
    product: { findMany: jest.fn() },
    sellerProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const products = {
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };
  const categories = {
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };
  const whatsapp = { sendOrderStatusUpdate: jest.fn() };

  let service: AdminService;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    whatsapp.sendOrderStatusUpdate.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductsService, useValue: products },
        { provide: CategoriesService, useValue: categories },
        { provide: WhatsAppService, useValue: whatsapp },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('analytics and listings', () => {
    it('builds analytics from paid revenue and preserves top-product ranking', async () => {
      prisma.order.count.mockResolvedValueOnce(14).mockResolvedValueOnce(3);
      prisma.user.count.mockResolvedValue(9);
      prisma.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 275.5 },
      });
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'product-2', _sum: { quantity: 8 } },
        { productId: 'product-1', _sum: { quantity: 5 } },
      ]);
      prisma.product.findMany.mockResolvedValue([
        { id: 'product-1', name: 'Tea', price: 15 },
        { id: 'product-2', name: 'Rice', price: 25 },
      ]);

      await expect(service.getAnalytics()).resolves.toEqual({
        totalOrders: 14,
        totalUsers: 9,
        totalRevenue: 275.5,
        ordersToday: 3,
        topProducts: [
          {
            productId: 'product-2',
            _sum: { quantity: 8 },
            product: { id: 'product-2', name: 'Rice', price: 25 },
          },
          {
            productId: 'product-1',
            _sum: { quantity: 5 },
            product: { id: 'product-1', name: 'Tea', price: 15 },
          },
        ],
      });

      expect(prisma.order.aggregate).toHaveBeenCalledWith({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'PAID' },
      });
      expect(prisma.order.count).toHaveBeenNthCalledWith(2, {
        where: {
          createdAt: {
            gte: new Date(new Date(now).setHours(0, 0, 0, 0)),
          },
        },
      });
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['product-2', 'product-1'] } },
        select: { id: true, name: true, price: true },
      });
    });

    it('uses zero when there is no paid revenue', async () => {
      prisma.order.count.mockResolvedValue(0);
      prisma.user.count.mockResolvedValue(0);
      prisma.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
      });
      prisma.orderItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);

      await expect(service.getAnalytics()).resolves.toEqual(
        expect.objectContaining({ totalRevenue: 0, topProducts: [] }),
      );
    });

    it('normalizes pagination, caps the page size, and applies an order status', async () => {
      prisma.order.findMany.mockResolvedValue([{ id: 'order-1' }]);
      prisma.order.count.mockResolvedValue(1);

      await expect(service.getOrders('0', '250', 'SHIPPED')).resolves.toEqual({
        data: [{ id: 'order-1' }],
        meta: { total: 1, page: 1, limit: 100 },
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'SHIPPED' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 100,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          items: true,
        },
      });
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: { status: 'SHIPPED' },
      });
    });

    it('lists only verified users with bounded pagination', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      prisma.user.count.mockResolvedValue(1);

      await expect(service.getUsers('3', '10')).resolves.toEqual({
        data: [{ id: 'user-1' }],
        meta: { total: 1, page: 3, limit: 10 },
      });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { isEmailVerified: true },
        skip: 20,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isBanned: true,
          isEmailVerified: true,
          createdAt: true,
        },
      });
    });
  });

  describe('order transitions', () => {
    it('rejects a status update when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('missing-order', { status: 'SHIPPED' }),
      ).rejects.toThrow('Order not found');
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('updates the order and notifies a verified phone asynchronously', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        user: { phone: '+992900000001', isPhoneVerified: true },
      });
      prisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERED',
      });
      whatsapp.sendOrderStatusUpdate.mockRejectedValue(new Error('notification unavailable'));

      await expect(service.updateOrderStatus('order-1', { status: 'DELIVERED' })).resolves.toEqual({
        id: 'order-1',
        status: 'DELIVERED',
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'DELIVERED' },
      });
      expect(whatsapp.sendOrderStatusUpdate).toHaveBeenCalledWith(
        '+992900000001',
        'order-1',
        'DELIVERED',
      );
    });

    it('does not notify an unverified phone', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        user: { phone: '+992900000001', isPhoneVerified: false },
      });
      prisma.order.update.mockResolvedValue({ id: 'order-1' });

      await service.updateOrderStatus('order-1', { status: 'PROCESSING' });

      expect(whatsapp.sendOrderStatusUpdate).not.toHaveBeenCalled();
    });

    it('moves a pending order to processing when payment becomes paid', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
      });
      prisma.order.update.mockResolvedValue({ id: 'order-1' });

      await service.confirmPayment('order-1', 'PAID');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { paymentStatus: 'PAID', status: 'PROCESSING' },
      });
    });

    it('does not overwrite status for a non-pending or unpaid order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'SHIPPED',
      });
      prisma.order.update.mockResolvedValue({ id: 'order-1' });

      await service.confirmPayment('order-1', 'FAILED');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { paymentStatus: 'FAILED' },
      });
    });

    it('rejects payment confirmation for an unknown order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.confirmPayment('missing-order', 'PAID')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('catalog and coupon administration', () => {
    it('delegates product and category mutations to their domain services', async () => {
      const productDto = {
        name: 'Tea',
        price: 10,
        stock: 4,
        categoryId: '8d3bce57-5e13-4d71-8942-72d6b7a49324',
      };
      const categoryDto = { name: 'Food' };
      products.create.mockReturnValue('created-product');
      products.update.mockReturnValue('updated-product');
      products.delete.mockReturnValue('deleted-product');
      categories.create.mockReturnValue('created-category');
      categories.update.mockReturnValue('updated-category');
      categories.delete.mockReturnValue('deleted-category');

      expect(service.createProduct(productDto)).toBe('created-product');
      expect(service.updateProduct('product-1', { stock: 5 })).toBe('updated-product');
      expect(service.deleteProduct('product-1')).toBe('deleted-product');
      expect(service.createCategory(categoryDto)).toBe('created-category');
      expect(service.updateCategory('category-1', categoryDto)).toBe('updated-category');
      expect(service.deleteCategory('category-1')).toBe('deleted-category');
      expect(products.create).toHaveBeenCalledWith(productDto);
      expect(categories.update).toHaveBeenCalledWith('category-1', categoryDto);
    });

    it('toggles an existing coupon and rejects an unknown coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValueOnce({
        id: 'coupon-1',
        isActive: true,
      });
      prisma.coupon.update.mockResolvedValue({
        id: 'coupon-1',
        isActive: false,
      });

      await expect(service.toggleCoupon('coupon-1')).resolves.toEqual({
        id: 'coupon-1',
        isActive: false,
      });
      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: { isActive: false },
      });

      prisma.coupon.findUnique.mockResolvedValueOnce(null);
      await expect(service.toggleCoupon('missing-coupon')).rejects.toThrow('Coupon not found');
    });

    it('validates coupon enum and positive numeric constraints', async () => {
      const dto = Object.assign(new CreateCouponDto(), {
        code: 'SAVE',
        discountType: 'UNKNOWN',
        discountValue: 0,
        minOrderValue: -1,
        maxUses: 0,
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['discountType', 'discountValue', 'minOrderValue', 'maxUses']),
      );

      const valid = Object.assign(new CreateCouponDto(), {
        code: 'SAVE10',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
      });
      await expect(validate(valid)).resolves.toHaveLength(0);
    });
  });

  describe('seller moderation', () => {
    it('filters sellers by status when requested', async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([]);

      await service.getSellers('PENDING');

      expect(prisma.sellerProfile.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('approves a seller and clears an earlier rejection reason', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1' });
      prisma.sellerProfile.update.mockResolvedValue({
        id: 'seller-1',
        status: 'APPROVED',
      });

      await service.approveSeller('seller-1');

      expect(prisma.sellerProfile.update).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
        data: { status: 'APPROVED', rejectionReason: null },
      });
    });

    it('records a rejection reason and rejects an unknown seller', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValueOnce({
        id: 'seller-1',
      });
      prisma.sellerProfile.update.mockResolvedValue({
        id: 'seller-1',
        status: 'REJECTED',
      });

      await service.rejectSeller('seller-1', 'Incomplete documents');

      expect(prisma.sellerProfile.update).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Incomplete documents',
        },
      });

      prisma.sellerProfile.findUnique.mockResolvedValueOnce(null);
      await expect(service.approveSeller('missing-seller')).rejects.toThrow('Seller not found');
    });
  });
});

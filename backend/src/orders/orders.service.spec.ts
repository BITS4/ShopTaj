import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const prisma = {
    order: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: OrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('findAll', () => {
    it('uses stable pagination defaults and scopes both queries to the user', async () => {
      const orders = [{ id: 'order-1', userId: 'user-1' }];
      prisma.order.findMany.mockResolvedValue(orders);
      prisma.order.count.mockResolvedValue(1);

      await expect(service.findAll('user-1')).resolves.toEqual({
        data: orders,
        meta: { total: 1, page: 1, limit: 10 },
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  images: { where: { isMain: true }, take: 1 },
                },
              },
            },
          },
        },
      });
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('parses requested pages and caps an excessive page size at 100', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(250);

      await expect(service.findAll('user-1', '3', '500')).resolves.toEqual({
        data: [],
        meta: { total: 250, page: 3, limit: 100 },
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 200, take: 100 }),
      );
    });

    it('clamps a negative page to the first page', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      await expect(service.findAll('user-1', '-4', '20')).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 20 },
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe('findOne', () => {
    it('returns an order only through the authenticated user scope', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        shippingAddress: { id: 'address-1' },
      };
      prisma.order.findFirst.mockResolvedValue(order);

      await expect(service.findOne('user-1', 'order-1')).resolves.toBe(order);
      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'order-1', userId: 'user-1' },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isMain: true }, take: 1 },
                },
              },
              variant: true,
            },
          },
          shippingAddress: true,
        },
      });
    });

    it('does not reveal an order that is missing or owned by someone else', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('user-1', 'foreign-order'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('rejects a missing or foreign order without attempting an update', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.cancel('user-1', 'foreign-order'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'foreign-order', userId: 'user-1' },
      });
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejects an already processed order so retries cannot overwrite its status', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: 'CANCELLED',
      });

      await expect(service.cancel('user-1', 'order-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('cancels a pending order and returns the persisted result', async () => {
      const cancelled = {
        id: 'order-1',
        userId: 'user-1',
        status: 'CANCELLED',
      };
      prisma.order.findFirst.mockResolvedValue({
        ...cancelled,
        status: 'PENDING',
      });
      prisma.order.update.mockResolvedValue(cancelled);

      await expect(service.cancel('user-1', 'order-1')).resolves.toBe(cancelled);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'CANCELLED' },
      });
    });
  });
});

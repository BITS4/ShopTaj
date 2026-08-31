import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  const prisma = {
    orderItem: { findFirst: jest.fn() },
    review: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  let service: ReviewsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ReviewsService);
  });

  it('paginates product reviews and calculates the visible-page average', async () => {
    const reviews = [
      { id: 'review-1', rating: 5 },
      { id: 'review-2', rating: 3 },
    ];
    prisma.review.findMany.mockResolvedValue(reviews);
    prisma.review.count.mockResolvedValue(12);

    await expect(service.getProductReviews('product-1', 2, 5)).resolves.toEqual({
      data: reviews,
      meta: { total: 12, page: 2, limit: 5, avgRating: 4 },
    });
    expect(prisma.review.findMany).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: 5,
      take: 5,
    });
    expect(prisma.review.count).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
    });
  });

  it('returns a zero average for an empty review page', async () => {
    prisma.review.findMany.mockResolvedValue([]);
    prisma.review.count.mockResolvedValue(0);

    await expect(service.getProductReviews('product-1')).resolves.toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 10, avgRating: 0 },
    });
  });

  it('forbids reviews from users without a paid order', async () => {
    prisma.orderItem.findFirst.mockResolvedValue(null);

    await expect(service.create('user-1', 'product-1', { rating: 5 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(prisma.orderItem.findFirst).toHaveBeenCalledWith({
      where: {
        productId: 'product-1',
        order: { userId: 'user-1', paymentStatus: 'PAID' },
      },
    });
    expect(prisma.review.findUnique).not.toHaveBeenCalled();
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('rejects a second review for the same purchased product', async () => {
    prisma.orderItem.findFirst.mockResolvedValue({ id: 'order-item-1' });
    prisma.review.findUnique.mockResolvedValue({ id: 'review-1' });

    await expect(service.create('user-1', 'product-1', { rating: 4 })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prisma.review.findUnique).toHaveBeenCalledWith({
      where: {
        userId_productId: { userId: 'user-1', productId: 'product-1' },
      },
    });
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('creates a review for a verified purchaser', async () => {
    const review = {
      id: 'review-1',
      userId: 'user-1',
      productId: 'product-1',
      rating: 4,
      comment: 'Fresh and fragrant',
    };
    prisma.orderItem.findFirst.mockResolvedValue({ id: 'order-item-1' });
    prisma.review.findUnique.mockResolvedValue(null);
    prisma.review.create.mockResolvedValue(review);

    await expect(
      service.create('user-1', 'product-1', {
        rating: 4,
        comment: 'Fresh and fragrant',
      }),
    ).resolves.toBe(review);

    expect(prisma.review.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        productId: 'product-1',
        rating: 4,
        comment: 'Fresh and fragrant',
      },
    });
  });
});

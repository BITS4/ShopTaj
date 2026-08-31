import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  const prisma = {
    wishlist: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  let service: WishlistService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WishlistService);
  });

  it('lists the authenticated user wishlist newest-first with a main image', async () => {
    const items = [
      {
        id: 'wishlist-1',
        userId: 'user-1',
        productId: 'product-1',
        product: { images: [{ url: 'https://cdn.example/main.jpg' }] },
      },
    ];
    prisma.wishlist.findMany.mockResolvedValue(items);

    await expect(service.getWishlist('user-1')).resolves.toBe(items);
    expect(prisma.wishlist.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: {
        product: {
          include: { images: { where: { isMain: true }, take: 1 } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('adds a product when the user-product pair is not present', async () => {
    const created = {
      id: 'wishlist-1',
      userId: 'user-1',
      productId: 'product-1',
    };
    prisma.wishlist.findUnique.mockResolvedValue(null);
    prisma.wishlist.create.mockResolvedValue(created);

    await expect(service.add('user-1', 'product-1')).resolves.toBe(created);
    expect(prisma.wishlist.findUnique).toHaveBeenCalledWith({
      where: {
        userId_productId: { userId: 'user-1', productId: 'product-1' },
      },
    });
    expect(prisma.wishlist.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', productId: 'product-1' },
    });
  });

  it('rejects a duplicate add instead of creating a second row', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({ id: 'wishlist-existing' });

    await expect(service.add('user-1', 'product-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.wishlist.create).not.toHaveBeenCalled();
  });

  it('removes by user-product scope and stays idempotent when no row exists', async () => {
    prisma.wishlist.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.remove('user-1', 'product-1')).resolves.toEqual({
      message: 'Removed from wishlist',
    });
    expect(prisma.wishlist.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', productId: 'product-1' },
    });
  });
});

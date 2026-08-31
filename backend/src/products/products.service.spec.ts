import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto, SortBy } from './dto/product-query.dto';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const prisma = {
    cartItem: { deleteMany: jest.fn() },
    orderItem: { count: jest.fn() },
    product: {
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productImage: {
      count: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    productVariant: { deleteMany: jest.fn() },
    review: { deleteMany: jest.fn() },
    wishlist: { deleteMany: jest.fn() },
  };

  let service: ProductsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('findAll', () => {
    it('uses active-only defaults and enriches products without reviews', async () => {
      const product = { id: 'product-1', name: 'Tea', reviews: [] };
      prisma.product.findMany.mockResolvedValue([product]);
      prisma.product.count.mockResolvedValue(1);

      await expect(service.findAll({})).resolves.toEqual({
        data: [{ ...product, avgRating: null, reviewCount: 0 }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        include: {
          images: { where: { isMain: true }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          reviews: { select: { rating: true } },
        },
      });
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('combines search and commerce filters and computes ratings', async () => {
      const product = {
        id: 'product-1',
        name: 'Green Tea',
        reviews: [{ rating: 5 }, { rating: 3 }],
      };
      prisma.product.findMany.mockResolvedValue([product]);
      prisma.product.count.mockResolvedValue(21);
      const query = {
        search: 'green',
        categoryId: 'category-1',
        brand: 'Pamir',
        minPrice: 10,
        maxPrice: 50,
        inStock: true,
        sortBy: SortBy.PRICE_ASC,
        page: 3,
        limit: 10,
        isActive: 'all',
      } as ProductQueryDto;

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: [{ ...product, avgRating: 4, reviewCount: 2 }],
        meta: { total: 21, page: 3, limit: 10, totalPages: 3 },
      });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'green', mode: 'insensitive' } },
              { description: { contains: 'green', mode: 'insensitive' } },
              { brand: { contains: 'green', mode: 'insensitive' } },
              { tags: { has: 'green' } },
            ],
            categoryId: 'category-1',
            brand: { equals: 'Pamir', mode: 'insensitive' },
            price: { gte: 10, lte: 50 },
            stock: { gt: 0 },
          },
          orderBy: { price: 'asc' },
          skip: 20,
          take: 10,
        }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          categoryId: 'category-1',
          price: { gte: 10, lte: 50 },
        }),
      });
    });

    it.each([
      [SortBy.PRICE_DESC, { price: 'desc' }],
      [SortBy.NEWEST, { createdAt: 'desc' }],
    ])('supports the %s sort order', async (sortBy, expectedOrder) => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ sortBy });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: expectedOrder }),
      );
    });

    it('builds a maximum-only price filter', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ maxPrice: 25 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, price: { lte: 25 } },
        }),
      );
    });
  });

  describe('product discovery', () => {
    it('returns a product detail with rating aggregates', async () => {
      const product = {
        id: 'product-1',
        slug: 'green-tea',
        reviews: [{ rating: 5 }, { rating: 4 }, { rating: 3 }],
      };
      prisma.product.findUnique.mockResolvedValue(product);

      await expect(service.findBySlug('green-tea')).resolves.toEqual({
        ...product,
        avgRating: 4,
        reviewCount: 3,
      });
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { slug: 'green-tea' },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
          category: { select: { id: true, name: true, slug: true } },
          reviews: {
            include: {
              user: {
                select: { id: true, fullName: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    });

    it('uses null for a product that has no ratings', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        slug: 'new-tea',
        reviews: [],
      });

      await expect(service.findBySlug('new-tea')).resolves.toEqual(
        expect.objectContaining({ avgRating: null, reviewCount: 0 }),
      );
    });

    it('rejects an unknown product slug', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('fetches the active featured shelf', async () => {
      const products = [{ id: 'product-1' }];
      prisma.product.findMany.mockResolvedValue(products);

      await expect(service.findFeatured()).resolves.toBe(products);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { isFeatured: true, isActive: true },
        include: { images: { where: { isMain: true }, take: 1 } },
        take: 8,
      });
    });

    it('fetches the newest active shelf', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.findNewArrivals();

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        include: { images: { where: { isMain: true }, take: 1 } },
        take: 8,
      });
    });

    it('limits autocomplete to active case-insensitive name matches', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.getAutocomplete('tea');

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          name: { contains: 'tea', mode: 'insensitive' },
        },
        select: { id: true, name: true, slug: true },
        take: 8,
      });
    });
  });

  describe('catalog mutations', () => {
    const dto: CreateProductDto = {
      name: 'Green Tea',
      price: 12,
      stock: 20,
      categoryId: '00000000-0000-4000-8000-000000000001',
      brand: 'Pamir',
    };

    it('makes a colliding slug unique and nests variants in the create', async () => {
      const withVariants: CreateProductDto = {
        ...dto,
        variants: [{ sku: 'TEA-100', stock: 4, size: '100g' }],
      };
      prisma.product.findUnique
        .mockResolvedValueOnce({ id: 'existing-product' })
        .mockResolvedValueOnce(null);
      prisma.product.create.mockResolvedValue({ id: 'product-1' });

      await service.create(withVariants);

      expect(prisma.product.findUnique).toHaveBeenNthCalledWith(1, {
        where: { slug: 'green-tea' },
      });
      expect(prisma.product.findUnique).toHaveBeenNthCalledWith(2, {
        where: { slug: 'green-tea-1' },
      });
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          slug: 'green-tea-1',
          variants: { create: withVariants.variants },
        },
        include: { variants: true },
      });
    });

    it('omits nested variants when creating a simple product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({ id: 'product-1' });

      await service.create(dto);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: { ...dto, slug: 'green-tea', variants: undefined },
        include: { variants: true },
      });
    });

    it('rejects updating a product that does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'Updated' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('updates scalar fields without forwarding variant writes', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'product-1' });
      prisma.product.update.mockResolvedValue({ id: 'product-1' });

      await service.update('product-1', {
        name: 'Updated Tea',
        variants: [{ sku: 'IGNORED', stock: 1 }],
      });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { name: 'Updated Tea' },
      });
    });

    it('rejects images for an unknown product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addImages('missing', [
          { url: 'https://cdn.example/a.jpg', publicId: 'a' },
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.productImage.count).not.toHaveBeenCalled();
    });

    it('marks only the first upload as main and preserves image ordering', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'product-1' });
      prisma.productImage.count.mockResolvedValue(0);
      prisma.productImage.createMany.mockResolvedValue({ count: 2 });

      await service.addImages('product-1', [
        { url: 'https://cdn.example/a.jpg', publicId: 'a' },
        { url: 'https://cdn.example/b.jpg', publicId: 'b' },
      ]);

      expect(prisma.productImage.createMany).toHaveBeenCalledWith({
        data: [
          {
            productId: 'product-1',
            url: 'https://cdn.example/a.jpg',
            publicId: 'a',
            isMain: true,
            sortOrder: 0,
          },
          {
            productId: 'product-1',
            url: 'https://cdn.example/b.jpg',
            publicId: 'b',
            isMain: false,
            sortOrder: 1,
          },
        ],
      });
    });

    it('appends uploads without replacing an existing main image', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'product-1' });
      prisma.productImage.count.mockResolvedValue(2);
      prisma.productImage.createMany.mockResolvedValue({ count: 1 });

      await service.addImages('product-1', [
        { url: 'https://cdn.example/c.jpg', publicId: 'c' },
      ]);

      expect(prisma.productImage.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ isMain: false, sortOrder: 2 }),
        ],
      });
    });
  });

  describe('delete', () => {
    it('rejects deleting an unknown product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.orderItem.count).not.toHaveBeenCalled();
    });

    it('soft-deletes a product referenced by order history', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'product-1' });
      prisma.orderItem.count.mockResolvedValue(2);
      prisma.product.update.mockResolvedValue({});

      await expect(service.delete('product-1')).resolves.toEqual({
        message:
          'Product hidden (it exists in order history and cannot be fully deleted)',
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { isActive: false },
      });
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('removes dependent shopping data before hard-deleting a new product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'product-1' });
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      prisma.wishlist.deleteMany.mockResolvedValue({ count: 1 });
      prisma.review.deleteMany.mockResolvedValue({ count: 1 });
      prisma.productImage.deleteMany.mockResolvedValue({ count: 2 });
      prisma.productVariant.deleteMany.mockResolvedValue({ count: 1 });
      prisma.product.delete.mockResolvedValue({ id: 'product-1' });

      await expect(service.delete('product-1')).resolves.toEqual({
        message: 'Product deleted',
      });

      const where = { where: { productId: 'product-1' } };
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith(where);
      expect(prisma.wishlist.deleteMany).toHaveBeenCalledWith(where);
      expect(prisma.review.deleteMany).toHaveBeenCalledWith(where);
      expect(prisma.productImage.deleteMany).toHaveBeenCalledWith(where);
      expect(prisma.productVariant.deleteMany).toHaveBeenCalledWith(where);
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'product-1' },
      });
    });
  });
});

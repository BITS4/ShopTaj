import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto, SortBy } from './dto/product-query.dto';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const {
      search,
      categoryId,
      brand,
      minPrice,
      maxPrice,
      minRating: _minRating,
      inStock,
      sortBy,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const visibilityQuery = query as ProductQueryDto & { isActive?: string };
    const where: Prisma.ProductWhereInput =
      visibilityQuery.isActive === 'all' ? {} : { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brand) where.brand = { equals: brand, mode: 'insensitive' };
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    if (inStock) where.stock = { gt: 0 };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy === SortBy.PRICE_ASC) orderBy = { price: 'asc' };
    if (sortBy === SortBy.PRICE_DESC) orderBy = { price: 'desc' };
    if (sortBy === SortBy.NEWEST) orderBy = { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { where: { isMain: true }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          reviews: { select: { rating: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const enriched = products.map((p) => ({
      ...p,
      avgRating: p.reviews.length
        ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
        : null,
      reviewCount: p.reviews.length,
    }));

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        category: { select: { id: true, name: true, slug: true } },
        reviews: {
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const avgRating = product.reviews.length
      ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
      : null;

    return { ...product, avgRating, reviewCount: product.reviews.length };
  }

  async findFeatured() {
    return this.prisma.product.findMany({
      where: { isFeatured: true, isActive: true },
      include: { images: { where: { isMain: true }, take: 1 } },
      take: 8,
    });
  }

  async findNewArrivals() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { images: { where: { isMain: true }, take: 1 } },
      take: 8,
    });
  }

  async getAutocomplete(q: string) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, name: true, slug: true },
      take: 8,
    });
  }

  async create(dto: CreateProductDto) {
    const slug = await this.generateSlug(dto.name);
    const { variants, ...productData } = dto;

    return this.prisma.product.create({
      data: {
        ...productData,
        slug,
        variants: variants ? { create: variants } : undefined,
      },
      include: { variants: true },
    });
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    const { variants: _variants, ...rest } = dto;
    return this.prisma.product.update({
      where: { id },
      data: rest,
    });
  }

  async addImages(productId: string, images: { url: string; publicId: string }[]) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.productImage.count({ where: { productId } });
    return this.prisma.productImage.createMany({
      data: images.map((img, i) => ({
        productId,
        url: img.url,
        publicId: img.publicId,
        isMain: existing === 0 && i === 0,
        sortOrder: existing + i,
      })),
    });
  }

  async delete(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    // Check if product is referenced in any orders (cannot delete order history)
    const inOrders = await this.prisma.orderItem.count({ where: { productId: id } });
    if (inOrders > 0) {
      // Soft-delete: hide from store without breaking order history
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
      return { message: 'Product hidden (it exists in order history and cannot be fully deleted)' };
    }

    // Clear cart items first to avoid FK violation
    await this.prisma.cartItem.deleteMany({ where: { productId: id } });
    await this.prisma.wishlist.deleteMany({ where: { productId: id } });
    await this.prisma.review.deleteMany({ where: { productId: id } });
    await this.prisma.productImage.deleteMany({ where: { productId: id } });
    await this.prisma.productVariant.deleteMany({ where: { productId: id } });
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }

  private async generateSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let counter = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }
}

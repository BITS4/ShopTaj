import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { ProductsService } from '../products/products.service';
import { CategoriesService, CreateCategoryDto } from '../categories/categories.service';

export class UpdateOrderStatusDto {
  @ApiProperty() @IsString() status: string;
}

export class CreateCouponDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty({ enum: DiscountType }) @IsEnum(DiscountType) discountType: DiscountType;
  @ApiProperty() @IsNumber() @IsPositive() discountValue: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() minOrderValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() maxUses?: number;
  @ApiPropertyOptional() @IsOptional() expiresAt?: Date;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
  ) {}

  async getAnalytics() {
    const [totalOrders, totalUsers, revenueResult, ordersToday, topProducts] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.user.count(),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'PAID' },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true },
    });

    return {
      totalOrders,
      totalUsers,
      totalRevenue: revenueResult._sum.totalAmount ?? 0,
      ordersToday,
      topProducts: topProducts.map((tp) => ({
        ...tp,
        product: products.find((p) => p.id === tp.productId),
      })),
    };
  }

  async getOrders(page?: any, limit?: any, status?: string) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(100, parseInt(limit) || 20);
    const skip = (p - 1) * l;
    const where: any = {};
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          items: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data: orders, meta: { total, page: p, limit: l } };
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.order.update({ where: { id: orderId }, data: { status: dto.status as any } });
  }

  async getUsers(page?: any, limit?: any) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(100, parseInt(limit) || 20);
    const skip = (p - 1) * l;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, fullName: true, role: true, isBanned: true, createdAt: true },
      }),
      this.prisma.user.count(),
    ]);
    return { data: users, meta: { total, page: p, limit: l } };
  }

  async banUser(userId: string, ban: boolean) {
    return this.prisma.user.update({ where: { id: userId }, data: { isBanned: ban } });
  }

  async getAllProducts() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        images: { where: { isMain: true }, take: 1 },
      },
    });
  }

  createProduct(dto: CreateProductDto) { return this.productsService.create(dto); }
  updateProduct(id: string, dto: any) { return this.productsService.update(id, dto); }
  deleteProduct(id: string) { return this.productsService.delete(id); }

  createCategory(dto: CreateCategoryDto) { return this.categoriesService.create(dto); }
  updateCategory(id: string, dto: any) { return this.categoriesService.update(id, dto); }
  deleteCategory(id: string) { return this.categoriesService.delete(id); }

  async getCoupons() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createCoupon(dto: CreateCouponDto) {
    return this.prisma.coupon.create({ data: dto as any });
  }

  async toggleCoupon(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.prisma.coupon.update({ where: { id }, data: { isActive: !coupon.isActive } });
  }
}

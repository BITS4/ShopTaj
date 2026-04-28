import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

export class CreateReviewDto {
  @ApiProperty() @IsInt() @Min(1) @Max(5) rating: number;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async getProductReviews(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / (reviews.length || 1);
    return { data: reviews, meta: { total, page, limit, avgRating: avg } };
  }

  async create(userId: string, productId: string, dto: CreateReviewDto) {
    const purchased = await this.prisma.orderItem.findFirst({
      where: { productId, order: { userId, paymentStatus: 'PAID' } },
    });
    if (!purchased) throw new ForbiddenException('You can only review products you have purchased');

    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) throw new BadRequestException('You already reviewed this product');

    return this.prisma.review.create({
      data: { userId, productId, rating: dto.rating, comment: dto.comment },
    });
  }
}

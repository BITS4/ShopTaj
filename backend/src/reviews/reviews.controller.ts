import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReviewsService, CreateReviewDto } from './reviews.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('product/:productId')
  getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.reviewsService.getProductReviews(productId, page, limit);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('product/:productId')
  create(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.id, productId, dto);
  }
}

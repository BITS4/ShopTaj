import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Get()
  getWishlist(@CurrentUser() user: any) {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post(':productId')
  add(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.wishlistService.add(user.id, productId);
  }

  @Delete(':productId')
  remove(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.wishlistService.remove(user.id, productId);
  }
}

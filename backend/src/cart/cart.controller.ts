import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CartService, AddCartItemDto, UpdateCartItemDto } from './cart.service';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  addItem(@CurrentUser() user: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:id')
  updateItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, id, dto);
  }

  @Delete('items/:id')
  removeItem(@CurrentUser() user: any, @Param('id') id: string) {
    return this.cartService.removeItem(user.id, id);
  }

  @Delete()
  clearCart(@CurrentUser() user: any) {
    return this.cartService.clearCart(user.id);
  }

  @Post('apply-coupon')
  applyCoupon(@CurrentUser() user: any, @Body('code') code: string) {
    return this.cartService.applyCoupon(user.id, code);
  }
}

import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.ordersService.findAll(user.id, page, limit);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.findOne(user.id, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.cancel(user.id, id);
  }
}

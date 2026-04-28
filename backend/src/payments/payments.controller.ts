import { Controller, Post, Body, Req, Headers, UseGuards, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentsService, CreatePaymentIntentDto } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('create-intent')
  createIntent(@CurrentUser() user: any, @Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(user.id, dto);
  }

  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}

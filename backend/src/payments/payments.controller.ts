import { Controller, Post, Body, Req, Headers, UseGuards, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PaymentsService, CreatePaymentIntentDto, ConfirmOrderDto, BankTransferOrderDto, BePaidCreateDto } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('create-intent')
  createIntent(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('confirm-order')
  confirmOrder(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmOrderDto) {
    return this.paymentsService.confirmOrder(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('bank-transfer-order')
  bankTransferOrder(@CurrentUser() user: AuthenticatedUser, @Body() dto: BankTransferOrderDto) {
    return this.paymentsService.createBankTransferOrder(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('bepaid-create')
  bepaidCreate(@CurrentUser() user: AuthenticatedUser, @Body() dto: BePaidCreateDto) {
    return this.paymentsService.createBePaidOrder(user.id, dto);
  }

  @Post('bepaid-webhook')
  bepaidWebhook(@Body() body: unknown) {
    return this.paymentsService.handleBePaidWebhook(body);
  }

  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}

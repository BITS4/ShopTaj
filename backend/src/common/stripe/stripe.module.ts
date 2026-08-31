import { Module } from '@nestjs/common';
import { STRIPE_GATEWAY, stripeGatewayProvider } from './stripe.provider';

@Module({
  providers: [stripeGatewayProvider],
  exports: [STRIPE_GATEWAY],
})
export class StripeModule {}

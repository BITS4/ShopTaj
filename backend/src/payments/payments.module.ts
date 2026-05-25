import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { EmailModule } from '../common/email/email.module';
import { WhatsAppModule } from '../common/whatsapp/whatsapp.module';
import { BePaidModule } from '../common/bepaid/bepaid.module';

@Module({
  imports: [EmailModule, WhatsAppModule, BePaidModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}

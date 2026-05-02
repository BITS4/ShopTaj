import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { EmailModule } from '../common/email/email.module';
import { SmsModule } from '../common/sms/sms.module';
import { BePaidModule } from '../common/bepaid/bepaid.module';

@Module({
  imports: [EmailModule, SmsModule, BePaidModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}

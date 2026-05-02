import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: any = null;
  private from: string = '';

  constructor(private config: ConfigService) {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    this.from = this.config.get<string>('TWILIO_PHONE_NUMBER') || '';

    const isReal = sid && token &&
      sid.startsWith('AC') && sid.length === 34 && !sid.includes('x') &&
      token.length >= 32 && !token.includes('your');

    if (isReal) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        this.client = require('twilio')(sid, token);
        this.logger.log('Twilio SMS service initialised');
      } catch {
        this.logger.warn('Twilio package not installed — SMS disabled');
      }
    } else {
      this.logger.warn('Twilio not configured — SMS notifications disabled');
    }
  }

  async sendOrderConfirmation(phone: string | null | undefined, orderId: string, total: string): Promise<void> {
    if (!phone || !this.client || !this.from) {
      this.logger.log(`SMS skipped (orderId=${orderId}, phone=${phone || 'none'})`);
      return;
    }

    const body =
      `ShopTaj: Ваш заказ #${orderId.slice(0, 8).toUpperCase()} принят и обрабатывается. ` +
      `Сумма: ${total}. Спасибо за покупку!`;

    try {
      await this.client.messages.create({ body, from: this.from, to: phone });
      this.logger.log(`SMS sent to ${phone}`);
    } catch (err: any) {
      this.logger.error(`SMS failed: ${err?.message}`);
    }
  }
}

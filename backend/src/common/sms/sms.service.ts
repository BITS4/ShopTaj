import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'ожидает подтверждения',
  PROCESSING: 'принят в обработку',
  SHIPPED: 'отправлен',
  DELIVERED: 'доставлен',
  CANCELLED: 'отменён',
  REFUNDED: 'возвращён',
};

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

  private async send(to: string, body: string): Promise<void> {
    if (!this.client || !this.from) return;
    try {
      await this.client.messages.create({ body, from: this.from, to });
      this.logger.log(`SMS sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`SMS failed to ${to}: ${err?.message}`);
    }
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    if (!phone) return;
    await this.send(phone, `ShopTaj: Ваш код подтверждения — ${otp}. Действителен 10 минут.`);
  }

  async sendOrderConfirmation(phone: string | null | undefined, orderId: string, total: string): Promise<void> {
    if (!phone) {
      this.logger.log(`SMS skipped (orderId=${orderId}, phone=none)`);
      return;
    }
    await this.send(
      phone,
      `ShopTaj: Ваш заказ #${orderId.slice(0, 8).toUpperCase()} принят и обрабатывается. Сумма: ${total}. Спасибо за покупку!`,
    );
  }

  async sendOrderStatusUpdate(phone: string | null | undefined, orderId: string, status: string): Promise<void> {
    if (!phone) return;
    const label = STATUS_LABELS[status] ?? status.toLowerCase();
    await this.send(
      phone,
      `ShopTaj: Статус вашего заказа #${orderId.slice(0, 8).toUpperCase()} обновлён — ${label}.`,
    );
  }
}

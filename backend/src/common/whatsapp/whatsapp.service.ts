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
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly isConfigured: boolean;

  constructor(private config: ConfigService) {
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.isConfigured = !!(this.phoneNumberId && this.accessToken);

    if (this.isConfigured) {
      this.logger.log('WhatsApp Business API initialized');
    } else {
      this.logger.warn('WhatsApp not configured — notifications disabled');
    }
  }

  private stripPlus(phone: string): string {
    return phone.replace(/^\+/, '');
  }

  private async sendTemplate(
    to: string,
    templateName: string,
    langCode: string,
    components: object[],
  ): Promise<void> {
    if (!this.isConfigured) return;
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: langCode },
            components,
          },
        }),
      });
      if (!res.ok) {
        const errorBody: unknown = await res.json().catch(() => ({}));
        this.logger.error(`WhatsApp API error to ${to}: ${JSON.stringify(errorBody)}`);
      } else {
        this.logger.log(`WhatsApp message sent to ${to}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`WhatsApp failed to ${to}: ${message}`);
    }
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    if (!phone) return;
    // Template: "Ваш код подтверждения ShopTaj — {{1}}. Действителен 10 минут."
    await this.sendTemplate(this.stripPlus(phone), 'shoptaj_otp', 'ru', [
      {
        type: 'body',
        parameters: [{ type: 'text', text: otp }],
      },
    ]);
  }

  async sendOrderConfirmation(
    phone: string | null | undefined,
    orderId: string,
    total: string,
  ): Promise<void> {
    if (!phone) {
      this.logger.log(`WhatsApp skipped (orderId=${orderId}, phone=none)`);
      return;
    }
    // Template: "Ваш заказ ShopTaj #{{1}} принят и обрабатывается. Сумма: {{2}}. Спасибо!"
    await this.sendTemplate(this.stripPlus(phone), 'shoptaj_order_confirmation', 'ru', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: orderId.slice(0, 8).toUpperCase() },
          { type: 'text', text: total },
        ],
      },
    ]);
  }

  async sendOrderStatusUpdate(
    phone: string | null | undefined,
    orderId: string,
    status: string,
  ): Promise<void> {
    if (!phone) return;
    const label = STATUS_LABELS[status] ?? status.toLowerCase();
    // Template: "Статус вашего заказа ShopTaj #{{1}} обновлён — {{2}}."
    await this.sendTemplate(this.stripPlus(phone), 'shoptaj_order_status', 'ru', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: orderId.slice(0, 8).toUpperCase() },
          { type: 'text', text: label },
        ],
      },
    ]);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface BePaidCheckoutResult {
  token: string;
  redirectUrl: string;
}

@Injectable()
export class BePaidService {
  private readonly logger = new Logger(BePaidService.name);
  private readonly shopId: string;
  private readonly secretKey: string;
  private readonly testMode: boolean;
  private readonly baseUrl = 'https://checkout.bepaid.by';
  private readonly apiUrl = 'https://api.bepaid.by';

  constructor(private config: ConfigService) {
    this.shopId = this.config.get('BEPAID_SHOP_ID') || '';
    this.secretKey = this.config.get('BEPAID_SECRET_KEY') || '';
    this.testMode = this.config.get('BEPAID_TEST_MODE') === 'true';
  }

  get isConfigured(): boolean {
    return !!(
      this.shopId &&
      this.secretKey &&
      !this.shopId.includes('your') &&
      !this.secretKey.includes('your')
    );
  }

  async createCheckout(params: {
    orderId: string;
    amount: number; // in dollars/main units
    currency: string;
    description: string;
    customerEmail: string;
    successUrl: string;
    failUrl: string;
    notificationUrl: string;
  }): Promise<BePaidCheckoutResult> {
    const amountCents = Math.round(params.amount * 100);

    const body = {
      checkout: {
        transaction_type: 'payment',
        test: this.testMode,
        attempts: 3,
        order: {
          amount: amountCents,
          currency: params.currency,
          description: params.description,
          tracking_id: params.orderId,
        },
        settings: {
          success_url: params.successUrl,
          fail_url: params.failUrl,
          decline_url: params.failUrl,
          cancel_url: params.failUrl,
          notification_url: params.notificationUrl,
          language: 'ru',
        },
        customer: {
          email: params.customerEmail,
        },
        // Accept all card types including UnionPay (Korti Milli)
        payment_method: {
          types: ['credit_card', 'alif_mobi'],
        },
      },
    };

    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');

    const { data } = await axios.post(`${this.baseUrl}/ctp/api/checkouts`, body, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-Version': '2',
      },
    });

    this.logger.log(
      `bePaid checkout created: token=${data.checkout.token} orderId=${params.orderId}`,
    );

    return {
      token: data.checkout.token,
      redirectUrl: data.checkout.redirect_url,
    };
  }

  verifyWebhookCredentials(shopId: string, secretKey: string): boolean {
    return shopId === this.shopId && secretKey === this.secretKey;
  }
}

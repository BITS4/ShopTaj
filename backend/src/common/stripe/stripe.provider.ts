import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_GATEWAY = Symbol('STRIPE_GATEWAY');

export interface StripeGateway {
  createPaymentIntent(params: Stripe.PaymentIntentCreateParams): Promise<Stripe.PaymentIntent>;
  retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent>;
  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event;
}

export class StripeSdkGateway implements StripeGateway {
  private readonly client: Stripe;

  constructor(secretKey: string) {
    // A syntactically valid placeholder lets the application boot for local
    // development. Stripe calls still fail closed until a real key is supplied.
    this.client = new Stripe(secretKey || 'sk_test_not_configured', {
      apiVersion: '2023-10-16',
    });
  }

  createPaymentIntent(params: Stripe.PaymentIntentCreateParams): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.create(params);
  }

  retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.retrieve(id);
  }

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    return this.client.webhooks.constructEvent(rawBody, signature, secret);
  }
}

/**
 * Deterministic, no-network Stripe replacement for unit and end-to-end tests.
 * Payment intents are considered successful immediately so order confirmation
 * paths can be exercised without a Stripe account.
 */
export class InMemoryStripeGateway implements StripeGateway {
  private readonly intents = new Map<string, Stripe.PaymentIntent>();
  private sequence = 0;

  async createPaymentIntent(
    params: Stripe.PaymentIntentCreateParams,
  ): Promise<Stripe.PaymentIntent> {
    this.sequence += 1;
    const id = `pi_test_${this.sequence}`;
    const intent = {
      id,
      object: 'payment_intent',
      amount: params.amount,
      client_secret: `${id}_secret_test`,
      currency: params.currency,
      metadata: params.metadata ?? {},
      status: 'succeeded',
    } as Stripe.PaymentIntent;
    this.intents.set(id, intent);
    return intent;
  }

  async retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    const intent = this.intents.get(id);
    if (!intent) throw new Error(`Unknown test payment intent: ${id}`);
    return intent;
  }

  constructWebhookEvent(rawBody: Buffer, _signature: string, _secret: string): Stripe.Event {
    return JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
  }
}

export const stripeGatewayProvider: Provider<StripeGateway> = {
  provide: STRIPE_GATEWAY,
  inject: [ConfigService],
  useFactory: (config: ConfigService): StripeGateway => {
    const isTest =
      config.get<string>('NODE_ENV') === 'test' || config.get<string>('TEST_MODE') === 'true';

    return isTest
      ? new InMemoryStripeGateway()
      : new StripeSdkGateway(config.get<string>('STRIPE_SECRET_KEY') || '');
  },
};

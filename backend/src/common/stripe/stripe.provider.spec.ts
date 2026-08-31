import { InMemoryStripeGateway } from './stripe.provider';

describe('InMemoryStripeGateway', () => {
  it('creates and retrieves successful payment intents without network access', async () => {
    const gateway = new InMemoryStripeGateway();

    const created = await gateway.createPaymentIntent({
      amount: 2599,
      currency: 'usd',
      metadata: { userId: 'user-1', addressId: 'address-1' },
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: 'pi_test_1',
        amount: 2599,
        currency: 'usd',
        status: 'succeeded',
        client_secret: 'pi_test_1_secret_test',
      }),
    );
    await expect(gateway.retrievePaymentIntent(created.id)).resolves.toBe(created);
  });

  it('parses local webhook fixtures and rejects unknown intents', async () => {
    const gateway = new InMemoryStripeGateway();
    const event = gateway.constructWebhookEvent(
      Buffer.from(JSON.stringify({ id: 'evt_test', type: 'payment_intent.succeeded' })),
      'unused-test-signature',
      'unused-test-secret',
    );

    expect(event).toEqual({
      id: 'evt_test',
      type: 'payment_intent.succeeded',
    });
    await expect(gateway.retrievePaymentIntent('pi_missing')).rejects.toThrow(
      'Unknown test payment intent',
    );
  });
});

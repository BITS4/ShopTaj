import { isCorsOriginAllowed, resolveCorsOrigins } from './cors';

describe('CORS configuration', () => {
  it('parses, trims, normalizes, and deduplicates configured origins', () => {
    expect(
      resolveCorsOrigins({
        CORS_ORIGINS: ' https://shop.example/,https://admin.example,https://shop.example ',
      }),
    ).toEqual(['https://shop.example', 'https://admin.example']);
  });

  it('falls back to the frontend and local development origins', () => {
    expect(resolveCorsOrigins({ FRONTEND_URL: 'https://shop.example/' })).toEqual([
      'https://shop.example',
      'http://localhost:3000',
      'http://localhost:8081',
    ]);
  });

  it('allows configured browser origins and requests without an Origin header', () => {
    const allowed = ['https://shop.example'];

    expect(isCorsOriginAllowed('https://shop.example/', allowed)).toBe(true);
    expect(isCorsOriginAllowed(undefined, allowed)).toBe(true);
  });

  it('rejects an unconfigured browser origin', () => {
    expect(isCorsOriginAllowed('https://malicious.example', ['https://shop.example'])).toBe(false);
  });
});

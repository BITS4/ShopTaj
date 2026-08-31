import { sanitizeRequestPath } from './request-path';

describe('sanitizeRequestPath', () => {
  it('removes query parameters from request paths', () => {
    expect(sanitizeRequestPath('/api/auth/verify-email?token=private-value')).toBe(
      '/api/auth/verify-email',
    );
  });

  it('preserves paths without a query string', () => {
    expect(sanitizeRequestPath('/api/products/featured')).toBe('/api/products/featured');
  });

  it('preserves an absent path', () => {
    expect(sanitizeRequestPath(undefined)).toBeUndefined();
  });
});

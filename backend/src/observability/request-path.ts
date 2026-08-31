/**
 * Keeps request metadata useful without retaining query parameters, which can
 * contain email verification tokens or other credentials.
 */
export function sanitizeRequestPath(value?: string): string | undefined {
  if (!value) {
    return value;
  }

  const queryIndex = value.indexOf('?');
  return queryIndex === -1 ? value : value.slice(0, queryIndex);
}

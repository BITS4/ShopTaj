export interface CorsEnvironment {
  CORS_ORIGINS?: string;
  FRONTEND_URL?: string;
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function resolveCorsOrigins(
  environment: CorsEnvironment = process.env,
): string[] {
  const configured = (environment.CORS_ORIGINS ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const fallback = [
    environment.FRONTEND_URL ?? '',
    'http://localhost:3000',
    'http://localhost:8081',
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set(configured.length > 0 ? configured : fallback)];
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  // CLI tools, native apps, health checks, and server-to-server requests do not
  // send an Origin header and are not subject to browser CORS enforcement.
  if (!origin) return true;
  return allowedOrigins.includes(normalizeOrigin(origin));
}

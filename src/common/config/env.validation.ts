/**
 * Boot-time environment-variable assertion.
 *
 * Performed before the Nest application bootstraps so that a
 * misconfigured deployment fails fast with a clear, actionable error
 * instead of crashing further down the request path.
 */

const REQUIRED_ALWAYS = ['DATABASE_URL', 'JWT_SECRET'] as const;
const MIN_PROD_SECRET_LENGTH = 32;

export function assertEnv(env: NodeJS.ProcessEnv): void {
  const missing = REQUIRED_ALWAYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `See .env.example for documentation.`,
    );
  }

  const isProduction = env.NODE_ENV === 'production';
  if (isProduction) {
    if ((env.JWT_SECRET ?? '').length < MIN_PROD_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET must be at least ${MIN_PROD_SECRET_LENGTH} characters in production.`,
      );
    }
    if (!env.ALLOWED_ORIGINS) {
      throw new Error(
        'ALLOWED_ORIGINS must be set in production to constrain CORS.',
      );
    }
  }
}

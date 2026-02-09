function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function lazyEnv(key: string, fallback?: string): string {
  return process.env[key] ?? fallback ?? '';
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  basePath: process.env.BASE_PATH || '/',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    path: process.env.DATABASE_PATH || './data/romm-request.db',
  },

  get oidc() {
    return {
      issuerUrl: env('OIDC_ISSUER_URL'),
      clientId: env('OIDC_CLIENT_ID'),
      clientSecret: env('OIDC_CLIENT_SECRET'),
      redirectUri: env('OIDC_REDIRECT_URI'),
      adminGroup: lazyEnv('OIDC_ADMIN_GROUP', 'romm-admin'),
    };
  },

  session: {
    secret: lazyEnv('SESSION_SECRET', 'dev-secret-change-in-production!!!!!'),
  },
} as const;

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from project root — optional, env vars can be set directly
try {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  process.loadEnvFile(resolve(root, '.env'));
} catch {
  // .env not found or unreadable — ignored
}

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function normalizeBasePath(raw: string): string {
  let p = raw.trim();
  if (!p.startsWith('/')) p = '/' + p;
  if (!p.endsWith('/')) p = p + '/';
  return p;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  basePath: normalizeBasePath(process.env.BASE_PATH || '/'),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  nodeEnv,
  isProduction,

  devAuth: process.env.DEV_AUTH === 'true' && !isProduction,

  db: {
    path: process.env.DATABASE_PATH || './data/romm-request.db',
  },

  oidcAdminGroup: process.env.OIDC_ADMIN_GROUP || 'romm-admin',

  get oidc() {
    return {
      issuerUrl: required('OIDC_ISSUER_URL'),
      clientId: required('OIDC_CLIENT_ID'),
      clientSecret: required('OIDC_CLIENT_SECRET'),
      redirectUri: required('OIDC_REDIRECT_URI'),
      adminGroup: this.oidcAdminGroup,
    };
  },

  get igdb() {
    return {
      clientId: required('IGDB_CLIENT_ID'),
      clientSecret: required('IGDB_CLIENT_SECRET'),
    };
  },

  session: {
    secret: isProduction
      ? required('SESSION_SECRET')
      : process.env.SESSION_SECRET || 'dev-secret-change-in-production!!!!!',
    salt: isProduction
      ? required('SESSION_SALT')
      : process.env.SESSION_SALT || 'romm-request-slt',
  },

  get email() {
    const host = process.env.SMTP_HOST;
    if (!host) return null;

    return {
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || `noreply@${host}`,
      adminEmail: process.env.ADMIN_EMAIL || '',
    };
  },
} as const;

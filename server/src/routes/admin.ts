import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../plugins/auth.js';
import { config } from '../config.js';

function isConfigured(envVar: string): boolean {
  return !!process.env[envVar]?.trim();
}

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAdmin);

  app.get('/config', async () => ({
    app: {
      basePath: config.basePath,
      appUrl: config.appUrl,
      environment: config.nodeEnv,
      devAuth: config.devAuth,
    },
    database: {
      path: config.db.path,
    },
    auth: {
      oidcIssuerUrl: isConfigured('OIDC_ISSUER_URL')
        ? process.env.OIDC_ISSUER_URL
        : null,
      adminGroup: config.oidcAdminGroup,
    },
    igdb: {
      configured: isConfigured('IGDB_CLIENT_ID'),
    },
    email: {
      configured: isConfigured('SMTP_HOST'),
      smtpHost: process.env.SMTP_HOST || null,
      fromAddress: process.env.SMTP_FROM || null,
      adminEmail: process.env.ADMIN_EMAIL || null,
    },
    romm: {
      configured: isConfigured('ROMM_DB_HOST'),
      host: process.env.ROMM_DB_HOST || null,
      database: process.env.ROMM_DB_NAME || 'romm',
    },
  }));
}

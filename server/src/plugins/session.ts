import fp from 'fastify-plugin';
import secureSession from '@fastify/secure-session';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

export default fp(async (app: FastifyInstance) => {
  const salt = config.session.salt;
  if (salt.length !== 16) {
    throw new Error(
      `SESSION_SALT must be exactly 16 characters (got ${salt.length})`
    );
  }

  await app.register(secureSession, {
    secret: config.session.secret,
    salt,
    cookie: {
      path: config.basePath,
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    },
  });
});

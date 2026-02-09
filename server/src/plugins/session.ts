import fp from 'fastify-plugin';
import secureSession from '@fastify/secure-session';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

export default fp(async (app: FastifyInstance) => {
  await app.register(secureSession, {
    secret: config.session.secret,
    salt: 'romm-request-slt',
    cookie: {
      path: config.basePath,
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    },
  });
});

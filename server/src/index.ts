import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { APP_NAME } from '@romm-request/shared';
import { config } from './config.js';
import sessionPlugin from './plugins/session.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import requestRoutes from './routes/requests.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify({
  logger: true,
  trustProxy: config.isProduction,
});

await app.register(sessionPlugin);
await app.register(authPlugin);

app.get(`${config.basePath}api/health`, async () => ({
  status: 'ok',
  name: APP_NAME,
  timestamp: new Date().toISOString(),
  devAuth: config.devAuth,
}));

await app.register(authRoutes, { prefix: `${config.basePath}api/auth` });
await app.register(gameRoutes, { prefix: `${config.basePath}api/games` });
await app.register(requestRoutes, {
  prefix: `${config.basePath}api/requests`,
});
await app.register(adminRoutes, { prefix: `${config.basePath}api/admin` });

if (config.isProduction) {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  await app.register(fastifyStatic, {
    root: clientDistPath,
    prefix: config.basePath,
    wildcard: false,
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.sendFile('index.html');
  });
}

async function start() {
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

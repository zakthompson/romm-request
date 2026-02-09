import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { APP_NAME } from '@romm-request/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const BASE_PATH = process.env.BASE_PATH || '/';
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = Fastify({ logger: true });

app.get(`${BASE_PATH}api/health`, async () => ({
  status: 'ok',
  name: APP_NAME,
  timestamp: new Date().toISOString(),
}));

if (NODE_ENV === 'production') {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  await app.register(fastifyStatic, {
    root: clientDistPath,
    prefix: BASE_PATH,
    wildcard: false,
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.sendFile('index.html');
  });
}

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

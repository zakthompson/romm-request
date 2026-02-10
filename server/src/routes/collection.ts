import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../plugins/auth.js';
import { getCollectionPlatforms } from '../services/romm.js';

export default async function collectionRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  app.get<{ Querystring: { igdbGameId?: string } }>(
    '/check',
    async (request, reply) => {
      const igdbGameId = parseInt(request.query.igdbGameId ?? '', 10);
      if (isNaN(igdbGameId) || igdbGameId <= 0) {
        return reply.code(400).send({
          error: 'Query parameter "igdbGameId" must be a positive integer',
        });
      }

      try {
        const platformIgdbIds = await getCollectionPlatforms(igdbGameId);
        return { platformIgdbIds };
      } catch (err) {
        app.log.error(err, 'RomM collection check failed');
        return reply.code(502).send({
          error: 'Failed to check collection. Please try again later.',
        });
      }
    }
  );
}

import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../plugins/auth.js';
import { searchGames, getGameDetails } from '../services/igdb.js';

export default async function gameRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  app.get<{ Querystring: { q?: string } }>(
    '/search',
    async (request, reply) => {
      const query = request.query.q?.trim();
      if (!query || query.length < 2) {
        return reply
          .code(400)
          .send({ error: 'Query parameter "q" must be at least 2 characters' });
      }

      const results = await searchGames(query);
      return results;
    }
  );

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return reply.code(400).send({ error: 'Invalid game ID' });
    }

    const game = await getGameDetails(id);
    if (!game) {
      return reply.code(404).send({ error: 'Game not found' });
    }

    return game;
  });
}

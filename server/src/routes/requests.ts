import type { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../plugins/auth.js';
import {
  createRequest,
  listRequests,
  getRequestById,
  updateRequestStatus,
} from '../services/requests.js';
import {
  REQUEST_STATUSES,
  type CreateRequestBody,
  type UpdateRequestBody,
  type RequestStatus,
} from '@romm-request/shared';

export default async function requestRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  app.post<{ Body: CreateRequestBody }>('/', async (request, reply) => {
    const body = request.body;

    if (
      !body ||
      typeof body.igdbGameId !== 'number' ||
      !body.gameName?.trim() ||
      !body.platformName?.trim() ||
      typeof body.platformIgdbId !== 'number'
    ) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    const result = createRequest(request.user!.id, {
      igdbGameId: body.igdbGameId,
      gameName: body.gameName.trim(),
      gameCoverUrl: body.gameCoverUrl ?? null,
      platformName: body.platformName.trim(),
      platformIgdbId: body.platformIgdbId,
    });

    if (result.error === 'duplicate') {
      return reply.code(409).send({
        error:
          'You already have a pending request for this game on this platform',
        existingRequest: result.request,
      });
    }

    return reply.code(201).send(result.request);
  });

  app.get<{ Querystring: { status?: string } }>('/', async (request, reply) => {
    const statusParam = request.query.status?.trim() as
      | RequestStatus
      | undefined;
    if (statusParam && !REQUEST_STATUSES.includes(statusParam)) {
      return reply.code(400).send({
        error: `Invalid status filter. Must be one of: ${REQUEST_STATUSES.join(', ')}`,
      });
    }

    const results = listRequests({
      userId: request.user!.id,
      status: statusParam,
      isAdmin: request.user!.isAdmin,
    });

    return results;
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return reply.code(400).send({ error: 'Invalid request ID' });
    }

    const result = getRequestById(id);
    if (!result) {
      return reply.code(404).send({ error: 'Request not found' });
    }

    if (!request.user!.isAdmin && result.userId !== request.user!.id) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    return result;
  });

  app.patch<{ Params: { id: string }; Body: UpdateRequestBody }>(
    '/:id',
    { onRequest: requireAdmin },
    async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return reply.code(400).send({ error: 'Invalid request ID' });
      }

      const body = request.body;
      if (!body?.status || !['fulfilled', 'rejected'].includes(body.status)) {
        return reply.code(400).send({
          error: 'Status must be "fulfilled" or "rejected"',
        });
      }

      const result = updateRequestStatus(id, body.status, body.adminNotes);

      if (result === null) {
        return reply.code(404).send({ error: 'Request not found' });
      }

      if ('error' in result && result.error === 'not_pending') {
        return reply
          .code(409)
          .send({ error: 'Only pending requests can be updated' });
      }

      return result;
    }
  );
}

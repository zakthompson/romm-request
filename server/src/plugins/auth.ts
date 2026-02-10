import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getUserById } from '../services/auth.js';

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.session.get('userId');
  if (!userId) {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  const user = getUserById(userId);
  if (!user) {
    request.session.delete();
    return reply.code(401).send({ error: 'User not found' });
  }

  request.user = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
  };
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  if (!request.user?.isAdmin) {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorate('requireAuth', requireAuth);
  app.decorate('requireAdmin', requireAdmin);
});

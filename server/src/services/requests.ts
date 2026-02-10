import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { requests, users } from '../db/schema.js';
import type {
  RequestStatus,
  CreateRequestBody,
  RequestDto,
} from '@romm-request/shared';

function toDto(
  row: typeof requests.$inferSelect,
  user?: { displayName: string; email: string }
): RequestDto {
  return {
    id: row.id,
    userId: row.userId,
    igdbGameId: row.igdbGameId,
    gameName: row.gameName,
    gameCoverUrl: row.gameCoverUrl,
    platformName: row.platformName,
    platformIgdbId: row.platformIgdbId,
    status: row.status,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    fulfilledAt: row.fulfilledAt,
    ...(user ? { user } : {}),
  };
}

export function createRequest(userId: number, body: CreateRequestBody) {
  const existing = db
    .select()
    .from(requests)
    .where(
      and(
        eq(requests.userId, userId),
        eq(requests.igdbGameId, body.igdbGameId),
        eq(requests.platformIgdbId, body.platformIgdbId),
        eq(requests.status, 'pending')
      )
    )
    .get();

  if (existing) {
    return { error: 'duplicate' as const, request: toDto(existing) };
  }

  const row = db
    .insert(requests)
    .values({
      userId,
      igdbGameId: body.igdbGameId,
      gameName: body.gameName,
      gameCoverUrl: body.gameCoverUrl,
      platformName: body.platformName,
      platformIgdbId: body.platformIgdbId,
    })
    .returning()
    .get();

  return { error: null, request: toDto(row) };
}

export function listRequests(opts: {
  userId?: number;
  status?: RequestStatus;
  isAdmin: boolean;
}): RequestDto[] {
  const conditions = [];

  if (!opts.isAdmin) {
    if (!opts.userId) return [];
    conditions.push(eq(requests.userId, opts.userId));
  }

  if (opts.status) {
    conditions.push(eq(requests.status, opts.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = db
    .select({
      request: requests,
      userDisplayName: users.displayName,
      userEmail: users.email,
    })
    .from(requests)
    .leftJoin(users, eq(requests.userId, users.id))
    .where(where)
    .orderBy(desc(requests.createdAt))
    .all();

  return rows.map((row) =>
    toDto(row.request, {
      displayName: row.userDisplayName ?? 'Unknown',
      email: row.userEmail ?? '',
    })
  );
}

export function getRequestById(id: number): RequestDto | null {
  const row = db
    .select({
      request: requests,
      userDisplayName: users.displayName,
      userEmail: users.email,
    })
    .from(requests)
    .leftJoin(users, eq(requests.userId, users.id))
    .where(eq(requests.id, id))
    .get();

  if (!row) return null;

  return toDto(row.request, {
    displayName: row.userDisplayName ?? 'Unknown',
    email: row.userEmail ?? '',
  });
}

export function updateRequestStatus(
  id: number,
  status: 'fulfilled' | 'rejected',
  adminNotes?: string
) {
  const existing = db.select().from(requests).where(eq(requests.id, id)).get();

  if (!existing) return null;

  if (existing.status !== 'pending') {
    return { error: 'not_pending' as const };
  }

  db.update(requests)
    .set({
      status,
      adminNotes: adminNotes ?? null,
      fulfilledAt: status === 'fulfilled' ? sql`(datetime('now'))` : null,
    })
    .where(eq(requests.id, id))
    .run();

  return getRequestById(id);
}

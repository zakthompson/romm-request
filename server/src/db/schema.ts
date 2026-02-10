import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type { RequestStatus } from '@romm-request/shared';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  oidcSub: text('oidc_sub').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`)
    .$onUpdate(() => sql`(datetime('now'))`),
});

export const requests = sqliteTable('requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  igdbGameId: integer('igdb_game_id').notNull(),
  gameName: text('game_name').notNull(),
  gameCoverUrl: text('game_cover_url'),
  platformName: text('platform_name').notNull(),
  platformIgdbId: integer('platform_igdb_id').notNull(),
  status: text('status').$type<RequestStatus>().notNull().default('pending'),
  adminNotes: text('admin_notes'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`)
    .$onUpdate(() => sql`(datetime('now'))`),
  fulfilledAt: text('fulfilled_at'),
});

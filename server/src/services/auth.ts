import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export interface OidcUserInfo {
  sub: string;
  email: string;
  name: string;
  groups: string[];
}

export function upsertUser(userInfo: OidcUserInfo, adminGroup: string) {
  const isAdmin = userInfo.groups.includes(adminGroup);

  const existing = db
    .select()
    .from(users)
    .where(eq(users.oidcSub, userInfo.sub))
    .get();

  if (existing) {
    db.update(users)
      .set({
        email: userInfo.email,
        displayName: userInfo.name,
        isAdmin,
      })
      .where(eq(users.oidcSub, userInfo.sub))
      .run();

    return {
      ...existing,
      email: userInfo.email,
      displayName: userInfo.name,
      isAdmin,
    };
  }

  const result = db
    .insert(users)
    .values({
      oidcSub: userInfo.sub,
      email: userInfo.email,
      displayName: userInfo.name,
      isAdmin,
    })
    .returning()
    .get();

  return result;
}

export function getUserById(id: number) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

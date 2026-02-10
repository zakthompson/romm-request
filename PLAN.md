# Implementation Plan: RomM Collection Integration

## Goal

Connect to an external RomM MariaDB database (read-only) to check whether a game is already in the user's collection. When viewing a game's detail dialog, platforms that already exist in the collection should show a green checkmark badge and be non-selectable for requests.

## RomM Database Schema (Reference)

RomM uses MariaDB. The two relevant tables:

### `platforms`

| Column    | Type    | Notes                               |
| --------- | ------- | ----------------------------------- |
| `id`      | INT     | PK, autoincrement                   |
| `igdb_id` | INT     | Nullable — IGDB platform identifier |
| `name`    | VARCHAR | e.g. "Nintendo 64", "PlayStation"   |
| `slug`    | VARCHAR | e.g. "n64", "psx"                   |

### `roms`

| Column        | Type    | Notes                           |
| ------------- | ------- | ------------------------------- |
| `id`          | INT     | PK, autoincrement               |
| `igdb_id`     | INT     | Nullable — IGDB game identifier |
| `platform_id` | INT     | FK → `platforms.id`             |
| `name`        | VARCHAR | Game display name               |

There is an index on `roms.igdb_id` (`idx_roms_igdb_id`).

### Key Query

Given an IGDB game ID, find which platforms (by IGDB platform ID) have ROMs in the collection:

```sql
SELECT DISTINCT p.igdb_id
FROM roms r
JOIN platforms p ON r.platform_id = p.id
WHERE r.igdb_id = ?
  AND p.igdb_id IS NOT NULL
```

This returns the set of IGDB platform IDs for which at least one ROM exists. The frontend can then cross-reference this with the game's platform list from IGDB.

## New Environment Variables

| Variable         | Description                                       |
| ---------------- | ------------------------------------------------- |
| `ROMM_DB_HOST`   | MariaDB hostname for RomM database                |
| `ROMM_DB_PORT`   | MariaDB port (default: `3306`)                    |
| `ROMM_DB_NAME`   | Database name (default: `romm`)                   |
| `ROMM_DB_USER`   | Database user (should have read-only permissions) |
| `ROMM_DB_PASSWD` | Database password                                 |

The feature is **gracefully disabled** when `ROMM_DB_HOST` is not set — the API returns an empty array and the frontend behaves as it does today.

## Architecture

- **New API endpoint**: `GET {basePath}api/collection/check?igdbGameId=X`
  - Returns: `{ platformIgdbIds: number[] }`
  - Auth: requires authenticated user (same as game routes)
  - Returns empty array if RomM DB not configured
- **Separate from IGDB routes**: The collection endpoint is a distinct concern. This allows parallel fetching, independent caching, and graceful degradation if the RomM DB is unreachable.
- **MySQL driver**: `mysql2` (promise API) — lightweight, widely used, supports MariaDB. Used directly with raw SQL (no ORM) since we only run a single read-only query against an external DB we don't own.
- **Connection pooling**: `mysql2/promise` pool created lazily on first request. Closed on server shutdown.

## Implementation Steps

---

### Step 1: Backend — Dependencies & Config

- [x] Install `mysql2` dependency in `server/package.json`
- [x] Add `romm` lazy getter to `server/src/config.ts`
- [x] Verify: `pnpm typecheck` passes

**Files to modify:**

- `server/package.json` — add `mysql2` dependency
- `server/src/config.ts` — add `romm` config section

**What to do:**

1. Install `mysql2` and `@types/mysql` (if needed — `mysql2` ships its own types):

   ```bash
   cd server && pnpm add mysql2
   ```

2. Add a `romm` lazy getter to `config` in `server/src/config.ts`, following the same pattern as `email` (returns `null` when `ROMM_DB_HOST` is not set):

   ```ts
   get romm() {
     const host = process.env.ROMM_DB_HOST;
     if (!host) return null;

     return {
       host,
       port: parseInt(process.env.ROMM_DB_PORT || '3306', 10),
       database: process.env.ROMM_DB_NAME || 'romm',
       user: required('ROMM_DB_USER'),
       password: required('ROMM_DB_PASSWD'),
     };
   },
   ```

**Verification:** `pnpm typecheck` passes.

---

### Step 2: Backend — RomM Database Connection & Service

- [ ] Create `server/src/db/romm.ts` (lazy MariaDB connection pool)
- [ ] Create `server/src/services/romm.ts` (collection query service)
- [ ] Verify: `pnpm typecheck` passes

**Files to create:**

- `server/src/db/romm.ts` — MariaDB connection pool (read-only)
- `server/src/services/romm.ts` — Collection query service

**What to do:**

1. Create `server/src/db/romm.ts`:
   - Import `mysql2/promise` and `config`
   - Create a lazily-initialized connection pool (only when `config.romm` is non-null)
   - Export a `getRommPool()` function that returns the pool or `null`
   - Export a `closeRommPool()` function for graceful shutdown

2. Create `server/src/services/romm.ts`:
   - Export `getCollectionPlatforms(igdbGameId: number): Promise<number[]>`
   - If pool is null (not configured), return `[]`
   - Run the query: `SELECT DISTINCT p.igdb_id FROM roms r JOIN platforms p ON r.platform_id = p.id WHERE r.igdb_id = ? AND p.igdb_id IS NOT NULL`
   - Return the array of platform IGDB IDs

**Verification:** `pnpm typecheck` passes.

---

### Step 3: Backend — API Route & Server Wiring

- [ ] Create `server/src/routes/collection.ts` (collection check endpoint)
- [ ] Register collection route in `server/src/index.ts`
- [ ] Add RomM pool shutdown hook in `server/src/index.ts`
- [ ] Add RomM config status to `server/src/routes/admin.ts`
- [ ] Verify: `pnpm typecheck` passes

**Files to modify:**

- `server/src/index.ts` — register new route, add shutdown hook
- `server/src/routes/admin.ts` — expose RomM config status

**Files to create:**

- `server/src/routes/collection.ts` — collection check endpoint

**What to do:**

1. Create `server/src/routes/collection.ts`:
   - `GET /check` with query param `igdbGameId` (required, integer)
   - Calls `getCollectionPlatforms(igdbGameId)`
   - Returns `{ platformIgdbIds: number[] }`
   - Uses `requireAuth` hook (same as game routes)
   - Catches errors and returns `502` with message (same pattern as game routes)

2. Register the route in `server/src/index.ts`:

   ```ts
   import collectionRoutes from './routes/collection.js';
   await app.register(collectionRoutes, {
     prefix: `${config.basePath}api/collection`,
   });
   ```

3. Add graceful shutdown for the RomM pool in `server/src/index.ts`:

   ```ts
   import { closeRommPool } from './db/romm.js';
   app.addHook('onClose', async () => {
     await closeRommPool();
   });
   ```

4. Add RomM config status to `server/src/routes/admin.ts`:
   ```ts
   romm: {
     configured: isConfigured('ROMM_DB_HOST'),
     host: process.env.ROMM_DB_HOST || null,
     database: process.env.ROMM_DB_NAME || 'romm',
   },
   ```

**Verification:** `pnpm typecheck` passes. Manually test with `curl` if dev environment allows.

---

### Step 4: Frontend — Collection Availability in Game Detail Dialog

- [ ] Add `useQuery` for collection check in `GameDetailDialog`
- [ ] Derive `collectedPlatformIds` set from query data
- [ ] Modify platform badges: green checkmark + non-clickable for collected platforms
- [ ] Verify: `pnpm typecheck` passes, visual check in browser

**Files to modify:**

- `client/src/components/game-detail-dialog.tsx` — fetch and display collection status

**What to do:**

1. Add a `useQuery` for collection data in `GameDetailDialog`:

   ```ts
   const collectionQuery = useQuery({
     queryKey: ['collection', 'check', gameId],
     queryFn: () =>
       apiFetch<{ platformIgdbIds: number[] }>(
         `/api/collection/check?igdbGameId=${gameId}`
       ),
     enabled: gameId !== null,
     staleTime: 5 * 60 * 1000,
   });
   ```

2. Derive a `Set` of collected platform IDs:

   ```ts
   const collectedPlatformIds = new Set(
     collectionQuery.data?.platformIgdbIds ?? []
   );
   ```

3. Modify the platform badge rendering to show collection status:
   - If `collectedPlatformIds.has(platform.id)`:
     - Add a green checkmark icon (use `Check` from lucide-react, already imported)
     - Use a visual style to indicate "in collection" (e.g. green-tinted badge variant or border)
     - Make the badge **non-clickable** (skip `onClick`, no cursor-pointer class)
   - Otherwise: keep current behavior (clickable, selectable)

4. The overall UX should be:
   - Platform badges load at the same time as game details (parallel fetch)
   - Platforms in the collection show a green checkmark and cannot be selected
   - Platforms NOT in the collection remain clickable and requestable as before
   - If the collection check fails or is loading, all platforms remain clickable (graceful degradation)

**Verification:** `pnpm typecheck` passes. Visual verification in browser.

---

### Step 5: Documentation & Config Files & Quality Checks

- [ ] Add RomM DB env vars to `.env.example`
- [ ] Add RomM DB env vars to `docker-compose.yml`
- [ ] Update `CLAUDE.md` (project structure, env vars, implementation notes)
- [ ] Update `ARCHITECTURE.md` (API endpoints, RomM DB integration section, system diagram)
- [ ] Run `pnpm check` — all checks pass (lint + format + typecheck)

**Files to modify:**

- `.env.example` — add RomM DB env vars
- `docker-compose.yml` — add RomM DB env vars
- `CLAUDE.md` — update project structure, env vars, implementation notes
- `ARCHITECTURE.md` — add collection check endpoint, document RomM DB integration

**What to do:**

1. Add to `.env.example`:

   ```env
   # RomM Collection Database (optional — collection check disabled when ROMM_DB_HOST is unset)
   ROMM_DB_HOST=
   ROMM_DB_PORT=3306
   ROMM_DB_NAME=romm
   ROMM_DB_USER=
   ROMM_DB_PASSWD=
   ```

2. Add to `docker-compose.yml` environment section:

   ```yaml
   - ROMM_DB_HOST=${ROMM_DB_HOST}
   - ROMM_DB_PORT=${ROMM_DB_PORT:-3306}
   - ROMM_DB_NAME=${ROMM_DB_NAME:-romm}
   - ROMM_DB_USER=${ROMM_DB_USER}
   - ROMM_DB_PASSWD=${ROMM_DB_PASSWD}
   ```

3. Update `CLAUDE.md`:
   - Add `server/src/db/romm.ts` and `server/src/services/romm.ts` and `server/src/routes/collection.ts` to project structure
   - Add new env vars to the environment variables table
   - Add implementation note about RomM collection integration

4. Update `ARCHITECTURE.md`:
   - Add collection check endpoint to API endpoints table
   - Add RomM DB integration section describing the read-only external DB connection
   - Update system overview diagram to show RomM DB connection

5. Run `pnpm check` (lint + format + typecheck) and fix any issues.

6. Run `pnpm format` to auto-format all modified files.

---

## Notes

- **Read-only safety**: We NEVER write to the RomM database. The `mysql2` connection is used exclusively for SELECT queries. For defense-in-depth, it's recommended that the `ROMM_DB_USER` be granted only SELECT privileges on the `romm` database.
- **Graceful degradation**: When `ROMM_DB_HOST` is not set, the feature is completely disabled — the API returns empty results and the UI behaves exactly as before.
- **No ORM for RomM DB**: We use raw SQL via `mysql2` rather than Drizzle. The RomM DB is an external system we don't own, and we run a single simple read query. Adding ORM schema definitions for it would be unnecessary complexity.
- **Connection pooling**: The `mysql2` pool handles connection lifecycle automatically. We create it lazily and close it on server shutdown.

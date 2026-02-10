# Architecture — RomM Request

Reference document for the technical architecture. Update this as the implementation evolves.

## System Overview

```
┌─────────────┐     OIDC/OAuth2     ┌────────────┐
│  Authentik   │◄──────────────────►│  Fastify    │
│  (IdP)       │                    │  Server     │
└─────────────┘                    │            │
                                    │  ┌────────┐│    ┌──────────┐
┌─────────────┐    HTTP/REST        │  │ Drizzle ││───►│  SQLite   │
│  React SPA   │◄──────────────────►│  │ ORM     ││    │  (file)   │
│  (Vite)      │   /api/*           │  └────────┘│    └──────────┘
└─────────────┘                    │            │
                                    │  ┌────────┐│    ┌──────────┐
                                    │  │Nodmail- ││───►│  SMTP     │
                                    │  │er       ││    │  Server   │
                                    │  └────────┘│    └──────────┘
                                    │            │
                                    │  ┌────────┐│    ┌──────────┐
                                    │  │ IGDB    ││───►│  Twitch/  │
                                    │  │ Service ││    │  IGDB API │
                                    │  └────────┘│    └──────────┘
                                    │            │
                                    │  ┌────────┐│    ┌──────────┐
                                    │  │ mysql2  ││───►│  RomM     │
                                    │  │ (r/o)   ││    │  MariaDB  │
                                    │  └────────┘│    └──────────┘
                                    └────────────┘
```

In production, Fastify serves the built React SPA as static files. In development, Vite dev server proxies API requests to Fastify.

## Database Schema

### users

| Column       | Type      | Notes                                   |
| ------------ | --------- | --------------------------------------- |
| id           | INTEGER   | PK, autoincrement                       |
| oidc_sub     | TEXT      | Unique, OIDC subject claim              |
| email        | TEXT      | From OIDC claims                        |
| display_name | TEXT      | From OIDC claims                        |
| is_admin     | BOOLEAN   | Derived from Authentik group membership |
| created_at   | TIMESTAMP | Default: now                            |
| updated_at   | TIMESTAMP | Updated on change                       |

### requests

| Column           | Type      | Notes                                    |
| ---------------- | --------- | ---------------------------------------- |
| id               | INTEGER   | PK, autoincrement                        |
| user_id          | INTEGER   | FK → users.id                            |
| igdb_game_id     | INTEGER   | IGDB game identifier                     |
| game_name        | TEXT      | Stored for display (denormalized)        |
| game_cover_url   | TEXT      | Nullable, IGDB cover image URL           |
| platform_name    | TEXT      | e.g. "Nintendo 64", "PlayStation 2"      |
| platform_igdb_id | INTEGER   | IGDB platform identifier                 |
| status           | TEXT      | `pending` / `fulfilled` / `rejected`     |
| admin_notes      | TEXT      | Nullable, set by admin on fulfill/reject |
| created_at       | TIMESTAMP | Default: now                             |
| updated_at       | TIMESTAMP | Updated on change                        |
| fulfilled_at     | TIMESTAMP | Nullable, set when fulfilled             |

**Constraint**: Unique on (`user_id`, `igdb_game_id`, `platform_igdb_id`) where `status = 'pending'` — prevents duplicate pending requests.

## API Endpoints

### Auth

| Method | Path                 | Auth | Description                                    |
| ------ | -------------------- | ---- | ---------------------------------------------- |
| GET    | `/api/auth/login`    | None | Redirects to Authentik OIDC authorization      |
| GET    | `/api/auth/callback` | None | OIDC callback, exchanges code, creates session |
| POST   | `/api/auth/logout`   | User | Destroys session                               |
| GET    | `/api/auth/me`       | User | Returns current user info                      |

### Games (IGDB)

| Method | Path                   | Auth | Description                     |
| ------ | ---------------------- | ---- | ------------------------------- |
| GET    | `/api/games/search?q=` | User | Search IGDB for games           |
| GET    | `/api/games/:id`       | User | Get game details with platforms |

### Requests

| Method | Path                | Auth  | Description                                                               |
| ------ | ------------------- | ----- | ------------------------------------------------------------------------- |
| POST   | `/api/requests`     | User  | Create a new game request                                                 |
| GET    | `/api/requests`     | User  | List requests (own for users, all for admins). Supports `?status=` filter |
| GET    | `/api/requests/:id` | User  | Get request details                                                       |
| PATCH  | `/api/requests/:id` | Admin | Update request status and notes                                           |

### Collection (RomM)

| Method | Path                               | Auth | Description                                            |
| ------ | ---------------------------------- | ---- | ------------------------------------------------------ |
| GET    | `/api/collection/check?igdbGameId` | User | Check which platforms have ROMs in the RomM collection |

### Admin

| Method | Path                | Auth  | Description                         |
| ------ | ------------------- | ----- | ----------------------------------- |
| GET    | `/api/admin/config` | Admin | Get safe (non-secret) server config |

### System

| Method | Path          | Auth | Description  |
| ------ | ------------- | ---- | ------------ |
| GET    | `/api/health` | None | Health check |

## Authentication Flow

```
1. User clicks "Sign in"
2. Frontend redirects to GET /api/auth/login
3. Server redirects to Authentik authorization endpoint (with OIDC params)
4. User authenticates in Authentik
5. Authentik redirects to GET /api/auth/callback with authorization code
6. Server exchanges code for tokens (ID token + access token)
7. Server extracts user info from ID token (sub, email, name, groups)
8. Server upserts user in DB, setting is_admin based on group claim
9. Server creates encrypted session cookie with user ID
10. Server redirects to frontend app
11. Frontend calls GET /api/auth/me to populate auth state
```

## Request Lifecycle

```
┌──────────┐     User submits      ┌──────────┐
│          │     request           │          │
│  Search  │─────────────────────►│ Pending  │
│  (IGDB)  │                      │          │
└──────────┘                      └────┬─────┘
                                       │
                              Admin reviews
                                       │
                          ┌────────────┼────────────┐
                          │                         │
                          ▼                         ▼
                   ┌────────────┐           ┌────────────┐
                   │ Fulfilled  │           │ Rejected   │
                   │            │           │            │
                   └────────────┘           └────────────┘
                          │                         │
                   Email sent to              Email sent to
                   requester                  requester
```

- **On request creation**: email notification sent to admin
- **On fulfill/reject**: email notification sent to the requesting user

## Frontend Route Structure

```
/                       → Redirect to /search (or /requests)
/login                  → Login page (unauthenticated)
/search                 → Game search + request creation flow
/requests               → User's request history
/admin/requests         → Admin: all requests (admin only)
/admin/config           → Admin: configuration (admin only)
```

## IGDB Integration

```
Server                          Twitch                    IGDB
  │                               │                        │
  │  POST /oauth2/token           │                        │
  │  (client_credentials)         │                        │
  │──────────────────────────────►│                        │
  │◄──────────────────────────────│                        │
  │  { access_token, expires_in } │                        │
  │                               │                        │
  │  POST /v4/games                                        │
  │  Headers: Client-ID, Bearer token                      │
  │  Body: Apicalypse query (plain text)                   │
  │───────────────────────────────────────────────────────►│
  │◄───────────────────────────────────────────────────────│
  │  JSON array of game objects                            │
```

- **Token**: Twitch OAuth2 client credentials, cached in memory, refreshed 60s before expiry
- **Query syntax**: Apicalypse (plain text POST body), e.g. `search "zelda"; fields name,cover.image_id; limit 20;`
- **Search filter**: `category = 0` (main games only), `version_parent = null` (no editions/versions)
- **Cover images**: `https://images.igdb.com/igdb/image/upload/t_{size}/{image_id}.jpg`
  - Sizes: `cover_small` (90x128), `cover_big` (264x374), `thumb` (90x90), `720p` (1280x720)
- **Rate limit**: 4 requests/second, 8 concurrent open requests

## Key Services (Backend)

- **AuthService** (`server/src/services/auth.ts`) — OIDC user upsert, getUserById
- **IGDBService** (`server/src/services/igdb.ts`) — Twitch token management, game search/details queries
- **RequestService** (`server/src/services/requests.ts`) — Request CRUD, duplicate pending detection, status transitions (pending → fulfilled/rejected), joins users for requester info
- **EmailService** (`server/src/services/email.ts`) — Nodemailer SMTP transport (lazy init, disabled when `SMTP_HOST` unset), HTML templates (new request → admin, status change → requester), fire-and-forget sending
- **RomMService** (`server/src/services/romm.ts`) — Read-only query against external RomM MariaDB. Returns IGDB platform IDs that have ROMs for a given IGDB game ID. Disabled when `ROMM_DB_HOST` is unset.

## RomM Collection Integration

Optional read-only integration with an external RomM MariaDB database. When configured, the app can check whether a game already exists in the RomM collection.

```
Server                          RomM MariaDB
  │                               │
  │  SELECT DISTINCT p.igdb_id    │
  │  FROM roms r                  │
  │  JOIN platforms p ...         │
  │  WHERE r.igdb_id = ?          │
  │──────────────────────────────►│
  │◄──────────────────────────────│
  │  [igdb_platform_ids]          │
```

- **Connection**: `mysql2/promise` pool, lazily initialized on first request, closed on server shutdown
- **Query**: Single read-only SELECT joining `roms` and `platforms` tables to find platforms with ROMs for a given IGDB game ID
- **Graceful degradation**: When `ROMM_DB_HOST` is unset, the feature is completely disabled — API returns empty results, frontend behaves as before
- **Frontend**: Game detail dialog fetches collection data in parallel with game details. Platforms in the collection show a green checkmark badge and cannot be selected for requests.

## Deployment

### Docker

Multi-stage Dockerfile with four stages: `base`, `deps`, `prod-deps`, `build`, `production`.

- **base**: `node:22-slim` with pnpm enabled via corepack
- **deps**: Installs all dependencies (dev + prod) for building
- **prod-deps**: Installs production-only dependencies (no devDeps)
- **build**: Builds all packages; accepts `BASE_PATH` build arg for Vite
- **production**: Copies only production deps, built server, built client, and migration files. Runs as non-root `node` user.

Database migrations run automatically on server startup via `drizzle-orm/better-sqlite3/migrator`.

### Subdirectory Deployment (BASE_PATH)

The app supports deployment at a URL subdirectory (e.g. `https://example.com/requests/`).

**How it works:**

1. `BASE_PATH` env var (e.g. `/requests/`) is normalized to always start and end with `/`
2. At **build time**: Vite reads `BASE_PATH` and sets it as the `base` config, so all asset URLs in the built HTML are prefixed correctly
3. At **runtime**: Fastify prefixes all API routes and static file serving with `basePath`
4. The client uses `import.meta.env.BASE_URL` (set by Vite from `base`) to prefix API calls and configure TanStack Router's `basepath`

**Configuration for subdirectory deployment:**

```env
BASE_PATH=/requests/
APP_URL=https://yourdomain.com
OIDC_REDIRECT_URI=https://yourdomain.com/requests/api/auth/callback
```

**Important:** `BASE_PATH` is a build-time value for the client (baked into the Vite build). If you change `BASE_PATH`, you must rebuild the Docker image.

### SWAG / Nginx Reverse Proxy

Example configs are provided in the project root:

- `romm-request.subdomain.conf.example` — for subdomain deployment (e.g. `requests.example.com`)
- `romm-request.subfolder.conf.example` — for subfolder deployment (e.g. `example.com/requests/`)

Copy the appropriate file to your SWAG nginx proxy-confs directory and customize.

**Cookie considerations**: The session cookie uses `sameSite: 'lax'` and `httpOnly: true`. When behind a reverse proxy, ensure `trustProxy` is enabled (it is — Fastify's `trustProxy` is set to `true` in production) so the session cookie's `secure` flag works correctly with HTTPS termination at the proxy.

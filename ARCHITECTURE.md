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

## Key Services (Backend)

- **AuthService** — OIDC discovery, token exchange, user upsert
- **IGDBService** — Twitch token management, game search/details queries
- **EmailService** — SMTP connection, template rendering, send with error handling
- **RequestService** — Request CRUD, duplicate detection, status transitions

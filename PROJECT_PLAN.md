# Project Plan — RomM Request

## Phase 1: Project Foundation

Set up the monorepo structure, tooling, and a minimal working shell for both client and server.

- [ ] **1.1 Initialize pnpm workspace and package scaffolding**
  - Create root `package.json` and `pnpm-workspace.yaml`
  - Create `client/`, `server/`, and `shared/` packages with their own `package.json`
  - Verify `pnpm install` works across the workspace

- [ ] **1.2 Configure TypeScript**
  - Root `tsconfig.json` with shared compiler options
  - Per-package `tsconfig.json` files extending root
  - `shared` package builds and is importable from both `client` and `server`

- [ ] **1.3 Set up the Fastify server**
  - Install Fastify and core dependencies
  - Create `server/src/index.ts` with a basic health-check endpoint (`GET /api/health`)
  - Add `tsx` for dev mode, build script via `tsup` or `tsc`
  - Verify: `pnpm --filter server dev` starts and responds on `/api/health`

- [ ] **1.4 Set up the Vite + React client**
  - Install Vite, React, TanStack Router
  - Set up file-based routing with a root layout and a placeholder index route
  - Verify: `pnpm --filter client dev` starts and renders in browser

- [ ] **1.5 Set up Tailwind CSS and shadcn/ui**
  - Install and configure Tailwind CSS in the client
  - Initialize shadcn/ui, add a few base components (Button, Card, Input) to verify it works
  - Apply a minimal global layout so subsequent phases have something to build on

- [ ] **1.6 Set up shared types package**
  - Create `shared/src/index.ts` with placeholder type exports
  - Confirm imports work in both `client` and `server`

- [ ] **1.7 Development tooling**
  - Root-level `pnpm dev` script that runs client and server concurrently
  - Root-level `pnpm build` script that builds all packages
  - `.gitignore` covering `node_modules`, `dist`, `.env`, SQLite files, etc.
  - `.env.example` with all required environment variables

- [ ] **1.8 Docker setup**
  - Multi-stage `Dockerfile` (install → build → production image)
  - `docker-compose.yml` with environment variable passthrough and volume for SQLite data
  - Verify: `docker compose up --build` starts the app and serves the client

---

## Phase 2: Authentication & User Management

Implement OIDC/OAuth2 login with Authentik, session management, and admin role detection.

- [ ] **2.1 Set up SQLite with Drizzle ORM**
  - Install `drizzle-orm`, `better-sqlite3`, `drizzle-kit`
  - Configure Drizzle with SQLite connection
  - Create `pnpm db:migrate` and `pnpm db:studio` scripts
  - Verify: migrations run and Drizzle Studio connects

- [ ] **2.2 Create users table**
  - Schema: `id`, `oidc_sub` (unique), `email`, `display_name`, `is_admin`, `created_at`, `updated_at`
  - Generate and run initial migration
  - Verify: table exists in SQLite after migration

- [ ] **2.3 Implement OIDC/OAuth2 flow**
  - Create a Fastify plugin that handles OIDC discovery (`.well-known/openid-configuration`)
  - Implement `/api/auth/login` — redirects to Authentik authorization endpoint
  - Implement `/api/auth/callback` — exchanges code for tokens, extracts user info and group claims
  - On successful auth: upsert user in DB (create or update from OIDC claims), set `is_admin` based on group membership
  - Verify: full login flow works against an Authentik instance (or mock)

- [ ] **2.4 Implement session management**
  - Install `@fastify/secure-session` (or `@fastify/session` + compatible store)
  - Store user ID in encrypted session cookie
  - Create `requireAuth` and `requireAdmin` decorators/hooks
  - Implement `/api/auth/me` — returns current user from session (or 401)
  - Implement `/api/auth/logout` — destroys session
  - Verify: session persists across requests, `/api/auth/me` returns user, logout clears session

- [ ] **2.5 Frontend auth integration**
  - Create `useAuth` hook (wraps TanStack Query call to `/api/auth/me`)
  - Create an auth context/provider that exposes user state and `isAdmin`
  - Implement login page with "Sign in with Authentik" button
  - Redirect unauthenticated users to login
  - Verify: login redirects to Authentik, callback lands back in the app with user state populated

- [ ] **2.6 App shell and navigation**
  - Create root layout with top nav bar showing user info and logout
  - For admin users: add a sidebar/side menu with links to admin sections (Requests, Configuration)
  - Non-admin users see a simpler layout (no admin menu)
  - Protected route wrappers for authenticated and admin-only routes
  - Verify: admin and non-admin users see different navigation

---

## Phase 3: IGDB Integration

Integrate with the IGDB API to enable game searching and platform selection.

- [ ] **3.1 IGDB API service (backend)**
  - Implement Twitch OAuth2 client credentials flow to obtain IGDB access token
  - Token auto-refresh when expired
  - Create service methods: `searchGames(query)`, `getGameDetails(id)` (includes platforms, cover art, summary)
  - Verify: service returns results for known game titles

- [ ] **3.2 Game search API endpoints**
  - `GET /api/games/search?q=<query>` — returns list of matching games (name, cover, year, platforms)
  - `GET /api/games/:id` — returns full game details including all platform versions
  - Both endpoints require authentication
  - Input validation and rate limiting (IGDB has rate limits — consider caching)
  - Verify: endpoints return correctly shaped data, auth is enforced

- [ ] **3.3 Game search UI**
  - Search input with debounced querying (TanStack Query)
  - Results displayed as cards (cover art, name, year)
  - Click a result to view full details with platform list
  - Verify: search works end-to-end in the browser, results render correctly

---

## Phase 4: Request System

Core feature: users create requests, view their history; admins manage all requests.

- [ ] **4.1 Create requests table**
  - Schema: `id`, `user_id` (FK), `igdb_game_id`, `game_name`, `game_cover_url`, `platform_name`, `platform_igdb_id`, `status` (pending/fulfilled/rejected), `admin_notes`, `created_at`, `updated_at`, `fulfilled_at`
  - Migration
  - Shared types for request status enum and request DTOs
  - Verify: table created, types importable from shared

- [ ] **4.2 Request API endpoints**
  - `POST /api/requests` — create a new request (authenticated users)
  - `GET /api/requests` — list requests (users see own, admins see all; supports `?status=` filter)
  - `GET /api/requests/:id` — get single request details
  - `PATCH /api/requests/:id` — update status and admin notes (admin only)
  - Prevent duplicate requests (same user + same game + same platform while pending)
  - Input validation on all endpoints
  - Verify: CRUD operations work, authorization enforced, duplicates rejected

- [ ] **4.3 Request creation flow (frontend)**
  - Full flow: search game → select game → choose platform → confirm & submit
  - Success/error feedback after submission
  - Verify: user can complete the full request flow end-to-end

- [ ] **4.4 User request history page**
  - List of current user's requests with status badges (pending/fulfilled/rejected)
  - Sorted by most recent, optionally filterable by status
  - Shows game cover, name, platform, date requested
  - Verify: page displays requests accurately, updates after new submission

- [ ] **4.5 Admin request management**
  - Admin request list page: shows all requests, filterable by status (default: pending)
  - Request detail view with ability to mark as fulfilled or rejected, with optional admin notes
  - Verify: admin can view all requests and change status; changes reflected immediately

- [ ] **4.6 Admin configuration page**
  - Accessible from admin sidebar
  - For now, minimal: display current configuration (read from env), placeholder for future settings
  - Verify: page renders, is admin-only

---

## Phase 5: Email Notifications

Notify admin of new requests and requesters when their request status changes.

- [ ] **5.1 SMTP email service**
  - Install Nodemailer, create email service with SMTP configuration from env vars
  - Create email sending utility with error handling (log failures, don't crash the app)
  - Verify: test email sends successfully via configured SMTP server

- [ ] **5.2 Email templates**
  - New request notification (to admin): includes game name, platform, requester name, link to admin view
  - Request fulfilled notification (to requester): includes game name, platform, any admin notes
  - Request rejected notification (to requester): includes game name, platform, admin notes/reason
  - Use simple HTML templates (inline styles for email client compatibility)
  - Verify: emails render correctly in an email client

- [ ] **5.3 Integrate email triggers**
  - Send admin notification email when a new request is created (Step 4.2 POST handler)
  - Send requester notification email when request status changes to fulfilled or rejected (Step 4.2 PATCH handler)
  - Email sending should be async/non-blocking — don't delay the API response
  - Verify: emails fire at correct times, contain correct data, app doesn't break if SMTP is down

---

## Phase 6: Production & Deployment

Finalize for self-hosted production deployment behind SWAG.

- [ ] **6.1 Subdirectory (BASE_PATH) support**
  - Vite config: set `base` to `BASE_PATH` at build time
  - Fastify: prefix all API routes and static serving with `BASE_PATH`
  - TanStack Router: configure `basepath` option
  - Auth callback URLs respect `BASE_PATH`
  - Verify: app works correctly at both `/` and a subdirectory like `/requests/`

- [ ] **6.2 Finalize Docker configuration**
  - Optimize Dockerfile (layer caching, minimal production image, non-root user)
  - `docker-compose.yml`: all env vars documented, persistent volume for SQLite, restart policy
  - Health check in docker-compose using `/api/health`
  - Verify: `docker compose up` from scratch works with only `.env` and `docker-compose.yml`

- [ ] **6.3 SWAG integration**
  - Provide example SWAG/nginx proxy configuration for subdirectory setup
  - Document any CORS or cookie settings needed for the reverse proxy
  - Verify: app accessible through SWAG at configured subdirectory

- [ ] **6.4 Final polish and documentation**
  - Error handling review: all API errors return consistent JSON shape
  - Loading and error states in all frontend pages
  - Update README with setup instructions, screenshots, configuration reference
  - Verify: clean startup from scratch following only the README

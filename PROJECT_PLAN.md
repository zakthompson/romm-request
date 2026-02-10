# Project Plan — RomM Request

## Phase 1: Project Foundation

Set up the monorepo structure, tooling, and a minimal working shell for both client and server.

- [x] **1.1 Initialize pnpm workspace and package scaffolding**
  - Create root `package.json` and `pnpm-workspace.yaml`
  - Create `client/`, `server/`, and `shared/` packages with their own `package.json`
  - Verify `pnpm install` works across the workspace

- [x] **1.2 Configure TypeScript**
  - Root `tsconfig.json` with shared compiler options
  - Per-package `tsconfig.json` files extending root
  - `shared` package builds and is importable from both `client` and `server`

- [x] **1.3 Set up the Fastify server**
  - Install Fastify and core dependencies
  - Create `server/src/index.ts` with a basic health-check endpoint (`GET /api/health`)
  - Add `tsx` for dev mode, build script via `tsup` (with `tsup.config.ts`)
  - Verify: `pnpm --filter server dev` starts and responds on `/api/health`
  - Note: Server also serves built client as static files in production via `@fastify/static`

- [x] **1.4 Set up the Vite + React client**
  - Install Vite, React, TanStack Router, TanStack Query
  - Set up file-based routing with a root layout and a placeholder index route
  - TanStack Router plugin auto-generates `routeTree.gen.ts`
  - Verify: `pnpm --filter client dev` starts and renders in browser

- [x] **1.5 Set up Tailwind CSS and shadcn/ui**
  - Tailwind CSS v4 with `@tailwindcss/vite` plugin (no `tailwind.config.js` — uses CSS-based config in `index.css`)
  - shadcn/ui set up manually with `components.json`, `cn()` utility, and base components (Button, Card, Input)
  - Dependencies: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`
  - Path alias `@/` configured in both Vite (`resolve.alias`) and TypeScript (`paths`)

- [x] **1.6 Set up shared types package**
  - Create `shared/src/index.ts` with placeholder type exports (`APP_NAME`, `RequestStatus`)
  - Confirm imports work in both `client` and `server`
  - Note: Shared package exports TypeScript source directly (not compiled JS) for dev simplicity. Server build bundles it via tsup `noExternal`.

- [x] **1.7 Development tooling**
  - Root-level `pnpm dev` script that runs client and server concurrently (via `concurrently`)
  - Root-level `pnpm build` script that builds all packages (shared → client → server)
  - `.gitignore` covering `node_modules`, `dist`, `.env`, SQLite files, `routeTree.gen.ts`, etc.
  - `.env.example` with all required environment variables

- [x] **1.8 Docker setup**
  - Multi-stage `Dockerfile` (base → deps → build → production) with `node:22-slim`
  - `docker-compose.yml` with environment variable passthrough, named volume for SQLite data, health check, restart policy
  - `.dockerignore` to exclude unnecessary files
  - Verified: `docker compose up --build` starts the app and serves both API and client

---

## Phase 2: Authentication & User Management

Implement OIDC/OAuth2 login with Authentik, session management, and admin role detection.

- [x] **2.1 Set up SQLite with Drizzle ORM**
  - Install `drizzle-orm`, `better-sqlite3`, `drizzle-kit`
  - Configure Drizzle with SQLite connection
  - Create `pnpm db:migrate` and `pnpm db:studio` scripts
  - Verify: migrations run and Drizzle Studio connects
  - Note: Added `better-sqlite3` to `onlyBuiltDependencies` in `pnpm-workspace.yaml`. DB connection in `server/src/db/index.ts` auto-creates the data directory. SQLite configured with WAL mode and foreign keys enabled.

- [x] **2.2 Create users table**
  - Schema: `id`, `oidc_sub` (unique), `email`, `display_name`, `is_admin`, `created_at`, `updated_at`
  - Generate and run initial migration
  - Verify: table exists in SQLite after migration
  - Note: Schema in `server/src/db/schema.ts`. Timestamps stored as TEXT using SQLite `datetime('now')`. Migration in `server/drizzle/0000_lumpy_mystique.sql`.

- [x] **2.3 Implement OIDC/OAuth2 flow**
  - Create a Fastify plugin that handles OIDC discovery (`.well-known/openid-configuration`)
  - Implement `/api/auth/login` — redirects to Authentik authorization endpoint
  - Implement `/api/auth/callback` — exchanges code for tokens, extracts user info and group claims
  - On successful auth: upsert user in DB (create or update from OIDC claims), set `is_admin` based on group membership
  - Verify: full login flow works against an Authentik instance (or mock)
  - Note: Uses `openid-client` v6 with PKCE (S256). OIDC config lazily discovered on first auth request. PKCE code verifier and state stored in session during login redirect. Config module (`server/src/config.ts`) centralizes env var access with lazy getters for OIDC to avoid startup errors when env vars are unset.

- [x] **2.4 Implement session management**
  - Install `@fastify/secure-session` (or `@fastify/session` + compatible store)
  - Store user ID in encrypted session cookie
  - Create `requireAuth` and `requireAdmin` decorators/hooks
  - Implement `/api/auth/me` — returns current user from session (or 401)
  - Implement `/api/auth/logout` — destroys session
  - Verify: session persists across requests, `/api/auth/me` returns user, logout clears session
  - Note: Uses `@fastify/secure-session` with secret+salt approach. Session cookie is httpOnly, sameSite=lax, 7-day maxAge. Auth hooks in `server/src/plugins/auth.ts` export `requireAuth` and `requireAdmin` functions. Session type augmentation in `server/src/types.d.ts`.

- [x] **2.5 Frontend auth integration**
  - Create `useAuth` hook (wraps TanStack Query call to `/api/auth/me`)
  - Create an auth context/provider that exposes user state and `isAdmin`
  - Implement login page with "Sign in with Authentik" button
  - Redirect unauthenticated users to login
  - Verify: login redirects to Authentik, callback lands back in the app with user state populated
  - Note: `useAuth` hook in `client/src/lib/auth.ts` uses TanStack Query with `authQueryOptions`. API client in `client/src/lib/api.ts` with typed error handling. Auth protection via `_authenticated` layout route — all authenticated routes are nested under it. Admin routes check `isAdmin` and redirect to `/search` if unauthorized. Placeholder routes created for `/search`, `/requests`, `/admin/requests`, `/admin/config`.

- [x] **2.6 App shell and navigation**
  - Create root layout with top nav bar showing user info and logout
  - For admin users: add a sidebar/side menu with links to admin sections (Requests, Configuration)
  - Non-admin users see a simpler layout (no admin menu)
  - Protected route wrappers for authenticated and admin-only routes
  - Verify: admin and non-admin users see different navigation
  - Note: Implemented as a horizontal nav bar (`NavBar` component) in the `_authenticated` layout rather than sidebar. Admin links (All Requests, Config) only shown when `isAdmin` is true. User dropdown menu shows email, admin badge, and sign-out option. Uses shadcn/ui DropdownMenu and lucide-react icons. Navigation uses TanStack Router `Link` components.

---

## Phase 3: IGDB Integration

Integrate with the IGDB API to enable game searching and platform selection.

- [x] **3.1 IGDB API service (backend)**
  - Implement Twitch OAuth2 client credentials flow to obtain IGDB access token
  - Token auto-refresh when expired
  - Create service methods: `searchGames(query)`, `getGameDetails(id)` (includes platforms, cover art, summary)
  - Verify: service returns results for known game titles
  - Note: Service in `server/src/services/igdb.ts`. Uses Twitch client credentials flow with automatic token caching and 60-second pre-expiry refresh. IGDB config uses lazy getter pattern (same as OIDC) to avoid startup failures when env vars are unset. Search filters to main games only (`category = 0`, `version_parent = null`). Cover URLs constructed via `buildCoverUrl()` helper using `t_cover_big` size. Apicalypse query syntax sent as plain text POST body.

- [x] **3.2 Game search API endpoints**
  - `GET /api/games/search?q=<query>` — returns list of matching games (name, cover, year, platforms)
  - `GET /api/games/:id` — returns full game details including all platform versions
  - Both endpoints require authentication
  - Input validation and rate limiting (IGDB has rate limits — consider caching)
  - Verify: endpoints return correctly shaped data, auth is enforced
  - Note: Routes in `server/src/routes/games.ts`, registered at `{basePath}api/games`. Both endpoints protected by `requireAuth` hook. Search requires `q` param of at least 2 characters. Game detail validates numeric ID. TanStack Query stale times on frontend provide effective caching layer (5 min for search, 10 min for details).

- [x] **3.3 Game search UI**
  - Search input with debounced querying (TanStack Query)
  - Results displayed as cards (cover art, name, year)
  - Click a result to view full details with platform list
  - Verify: search works end-to-end in the browser, results render correctly
  - Note: Search page in `client/src/routes/_authenticated/search.tsx`. Uses 300ms debounce via custom `useDebounce` hook (`client/src/lib/hooks/use-debounce.ts`). Results shown as a responsive grid of cover art cards (`GameResultCard` component). Clicking a card opens a `GameDetailDialog` with full game info, summary, and platform badges. Added shadcn/ui components: Badge, Skeleton, Dialog, Separator, ScrollArea.

---

## Phase 4: Request System

Core feature: users create requests, view their history; admins manage all requests.

- [x] **4.1 Create requests table**
  - Schema: `id`, `user_id` (FK), `igdb_game_id`, `game_name`, `game_cover_url`, `platform_name`, `platform_igdb_id`, `status` (pending/fulfilled/rejected), `admin_notes`, `created_at`, `updated_at`, `fulfilled_at`
  - Migration
  - Shared types for request status enum and request DTOs
  - Verify: table created, types importable from shared
  - Note: Schema in `server/src/db/schema.ts`. Migration `0001_create-requests-table.sql` includes a partial unique index (`WHERE status = 'pending'`) on `(user_id, igdb_game_id, platform_igdb_id)` to prevent duplicate pending requests — added manually since Drizzle doesn't support partial indexes natively. Shared package updated with `CreateRequestBody`, `UpdateRequestBody`, `RequestDto` types and `REQUEST_STATUSES` constant.

- [x] **4.2 Request API endpoints**
  - `POST /api/requests` — create a new request (authenticated users)
  - `GET /api/requests` — list requests (users see own, admins see all; supports `?status=` filter)
  - `GET /api/requests/:id` — get single request details
  - `PATCH /api/requests/:id` — update status and admin notes (admin only)
  - Prevent duplicate requests (same user + same game + same platform while pending)
  - Input validation on all endpoints
  - Verify: CRUD operations work, authorization enforced, duplicates rejected
  - Note: Service in `server/src/services/requests.ts` with `createRequest`, `listRequests`, `getRequestById`, `updateRequestStatus` functions. Routes in `server/src/routes/requests.ts`, registered at `{basePath}api/requests`. All routes require auth; PATCH requires admin. Duplicate detection via application-level check (backed by partial unique index). List endpoint joins with users table to include requester info. Non-admin users can only see their own requests.

- [x] **4.3 Request creation flow (frontend)**
  - Full flow: search game → select game → choose platform → confirm & submit
  - Success/error feedback after submission
  - Verify: user can complete the full request flow end-to-end
  - Note: Updated `GameDetailDialog` to support platform selection (clickable badges) and request submission via `useMutation`. Shows success confirmation with link to My Requests page. Displays API errors (including duplicate detection) inline. State resets when dialog closes. Invalidates `['requests']` query cache on success.

- [x] **4.4 User request history page**
  - List of current user's requests with status badges (pending/fulfilled/rejected)
  - Sorted by most recent, optionally filterable by status
  - Shows game cover, name, platform, date requested
  - Verify: page displays requests accurately, updates after new submission
  - Note: Implemented in `client/src/routes/_authenticated/requests.tsx`. Uses TanStack Query with 30s stale time. Status filter badges (All/Pending/Fulfilled/Rejected) drive query params. Each request shown as a card with cover art, game name, platform, status badge with icon, date, and admin notes (if any). Empty state encourages searching for games. Skeleton loading state for UX.

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

# RomM Request

A self-hosted web application for requesting games to be added to a RomM collection. Overseerr-like UX: users search IGDB for games, select platform/version, and submit requests. Admins manually fulfill requests and notify users.

## Tech Stack

- **Frontend**: React, TanStack (Router, Query, + Form/Table as needed), Tailwind CSS, shadcn/ui, Vite
- **Backend**: Fastify, Drizzle ORM, better-sqlite3
- **Auth**: OIDC/OAuth2 via Authentik (admin role via group claim)
- **Email**: Nodemailer (SMTP)
- **Language**: TypeScript throughout (pnpm workspaces monorepo)
- **Infrastructure**: Docker, deployed as subdirectory behind SWAG reverse proxy

## Project Structure

```
/
├── client/                # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── nav-bar.tsx  # App navigation bar (auth-aware, admin links)
│   │   │   └── ui/          # shadcn/ui components (Button, Card, Input, DropdownMenu)
│   │   ├── lib/
│   │   │   ├── api.ts       # Typed API client (apiFetch, ApiError)
│   │   │   ├── auth.ts      # useAuth hook, authQueryOptions, User type
│   │   │   └── utils.ts     # cn() utility for Tailwind class merging
│   │   ├── routes/          # TanStack Router file-based routes
│   │   │   ├── __root.tsx   # Root layout
│   │   │   ├── index.tsx    # Home/login page (redirects if authenticated)
│   │   │   └── _authenticated.tsx  # Auth-protected layout wrapper
│   │   │       ├── search.tsx          # Game search (placeholder)
│   │   │       ├── requests.tsx        # User request history (placeholder)
│   │   │       └── admin/
│   │   │           ├── requests.tsx    # Admin: all requests (placeholder)
│   │   │           └── config.tsx      # Admin: configuration (placeholder)
│   │   ├── index.css        # Tailwind v4 CSS config with theme variables
│   │   ├── main.tsx         # App entry point
│   │   └── routeTree.gen.ts # Auto-generated (gitignored)
│   ├── components.json      # shadcn/ui config
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                # Fastify backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── auth.ts    # Auth routes (login, callback, me, logout)
│   │   ├── services/
│   │   │   └── auth.ts    # User upsert, getUserById
│   │   ├── db/
│   │   │   ├── index.ts   # Database connection (better-sqlite3 + Drizzle)
│   │   │   └── schema.ts  # Drizzle table definitions (users)
│   │   ├── plugins/
│   │   │   ├── auth.ts    # requireAuth, requireAdmin hooks
│   │   │   └── session.ts # @fastify/secure-session setup
│   │   ├── config.ts      # Centralized env var config
│   │   ├── types.d.ts     # Type augmentations (Fastify, SessionData)
│   │   └── index.ts       # Server entry point, health check, static serving
│   ├── drizzle/           # Generated SQL migrations
│   ├── drizzle.config.ts  # Drizzle Kit config
│   ├── tsup.config.ts     # Server build config (bundles shared package)
│   ├── tsconfig.json
│   └── package.json
├── shared/                # Shared TypeScript types & constants
│   ├── src/
│   │   └── index.ts       # APP_NAME, RequestStatus type
│   ├── tsconfig.json
│   └── package.json
├── .dockerignore
├── .env.example
├── .gitignore
├── .prettierrc            # Prettier config
├── .prettierignore
├── docker-compose.yml
├── Dockerfile
├── eslint.config.js       # ESLint v9 flat config (root, covers all packages)
├── package.json           # Root workspace config
├── pnpm-workspace.yaml
└── tsconfig.json          # Root TypeScript config
```

## Key Architectural Decisions

- **pnpm workspaces** monorepo: `client`, `server`, `shared` packages
- **SQLite** — single file DB, no extra container, appropriate for low-traffic self-hosted use
- **Drizzle ORM** — lightweight, TypeScript-first, excellent SQLite support
- **Fastify** — lightweight but full-featured (built-in validation, plugins for OAuth/sessions/static)
- **OIDC/OAuth2** — app handles the OAuth flow directly with Authentik; admin users identified by Authentik group claim (configurable group name, e.g. `romm-admin`)
- **Subdirectory deployment** — runs behind SWAG at a configurable `BASE_PATH` (e.g. `/requests/`)
- **Production serving** — Fastify serves the built Vite frontend as static files

## Key Implementation Notes

- **Shared package** exports TypeScript source directly (`"import": "./src/index.ts"`) — not compiled JS. This avoids needing to rebuild shared on every change during dev. The server's `tsup.config.ts` uses `noExternal: ["@romm-request/shared"]` to bundle it. Vite handles it natively.
- **Tailwind CSS v4** — configured via CSS (`@theme` directives in `client/src/index.css`) rather than `tailwind.config.js`. Uses `@tailwindcss/vite` plugin.
- **shadcn/ui** — components are added manually to `client/src/components/ui/`. The `@/` path alias is configured in both `vite.config.ts` (`resolve.alias`) and `client/tsconfig.json` (`paths`).
- **Server build** — `tsup` bundles the server entry point and inlines the shared package. Production runs `node server/dist/index.js`.
- **Client dev proxy** — Vite proxies `/api` requests to `http://localhost:3000` during development.
- **ESLint** — v9 flat config at project root (`eslint.config.js`). Uses `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `eslint-config-prettier`. React rules scoped to `client/**`, Node globals scoped to `server/**`.
- **Prettier** — configured via `.prettierrc`. Run `pnpm format` to auto-format, `pnpm format:check` to validate.
- **Database** — SQLite via better-sqlite3 with Drizzle ORM. WAL mode and foreign keys enabled. Migrations in `server/drizzle/`, run via `pnpm db:migrate`. Config in `server/drizzle.config.ts`. **Always generate migrations with descriptive names:** `drizzle-kit generate --name <name>` (e.g. `create-users-table`). Never use the default random names.
- **Auth (backend)** — OIDC/OAuth2 via `openid-client` v6 with PKCE. Session via `@fastify/secure-session` (encrypted cookie, secret+salt). Config module (`server/src/config.ts`) with lazy getters for OIDC env vars. Type augmentations in `server/src/types.d.ts`.
- **Auth (frontend)** — `useAuth` hook (`client/src/lib/auth.ts`) queries `/api/auth/me` via TanStack Query. `_authenticated` layout route protects all authenticated pages. Admin routes check `isAdmin` in the component body. API client (`client/src/lib/api.ts`) with typed error handling.
- **Route protection** — Backend: `requireAuth` and `requireAdmin` hooks in `server/src/plugins/auth.ts`. Frontend: `_authenticated` layout route redirects to `/` if not authenticated; admin pages redirect to `/search` if not admin.

## Environment Variables

| Variable             | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `DATABASE_PATH`      | Path to SQLite database file (default: `./data/romm-request.db`)            |
| `OIDC_ISSUER_URL`    | Authentik OIDC issuer URL                                                   |
| `OIDC_CLIENT_ID`     | OAuth2 client ID                                                            |
| `OIDC_CLIENT_SECRET` | OAuth2 client secret                                                        |
| `OIDC_REDIRECT_URI`  | OAuth2 callback URL                                                         |
| `OIDC_ADMIN_GROUP`   | Authentik group name that grants admin access                               |
| `SESSION_SECRET`     | Secret for secure session encryption (min 32 chars, required in production) |
| `SESSION_SALT`       | 16-character salt for session key derivation (required in production)       |
| `DEV_AUTH`           | Set to `true` to enable dev-login route (ignored in production)             |
| `IGDB_CLIENT_ID`     | Twitch/IGDB client ID                                                       |
| `IGDB_CLIENT_SECRET` | Twitch/IGDB client secret                                                   |
| `SMTP_HOST`          | SMTP server hostname                                                        |
| `SMTP_PORT`          | SMTP server port                                                            |
| `SMTP_USER`          | SMTP username                                                               |
| `SMTP_PASS`          | SMTP password                                                               |
| `SMTP_FROM`          | From address for outbound emails                                            |
| `ADMIN_EMAIL`        | Admin email for new-request notifications                                   |
| `BASE_PATH`          | Base URL path for subdirectory deployment (default: `/`)                    |
| `APP_URL`            | Full public URL of the app (used in emails and redirects)                   |
| `PORT`               | Server port (default: `3000`)                                               |

## Development Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Run client + server concurrently in dev mode
pnpm build                # Build all packages for production
pnpm start                # Start production server
pnpm lint                 # Run ESLint
pnpm lint:fix             # Run ESLint with auto-fix
pnpm format               # Format all files with Prettier
pnpm format:check         # Check formatting without writing
pnpm typecheck            # Run TypeScript type checking across all packages
pnpm check                # Run all checks: lint + format + typecheck
pnpm db:migrate           # Run database migrations
pnpm db:studio            # Open Drizzle Studio for DB inspection
```

## Docker

```bash
docker compose up -d                  # Run with docker-compose
docker compose up -d --build          # Rebuild and run
```

## Mandatory: Code Quality Checks

**Before calling any task done, you MUST run `pnpm check` and resolve all issues.** This runs:

1. `pnpm lint` — ESLint with zero warnings allowed (warnings are treated as errors)
2. `pnpm format:check` — Prettier formatting validation (run `pnpm format` to fix)
3. `pnpm typecheck` — TypeScript type checking across all packages

**ESLint rule disabling:** Only disable an ESLint rule when absolutely necessary, and always include a comment explaining why. Prefer fixing the code over suppressing the warning.

## Mandatory: Keeping Documentation Current

**After completing any step or making significant changes, you MUST:**

1. **Update PROJECT_PLAN.md** — Check off completed steps (`[x]`), and add notes about any deviations from the plan or decisions made during implementation.
2. **Update this file (CLAUDE.md)** — If new patterns, conventions, files, commands, or environment variables were introduced, reflect them here. Keep the Project Structure section accurate.
3. **Update ARCHITECTURE.md** — If API endpoints, DB schema, or data flows changed, update accordingly.

Do NOT defer these updates. Do them immediately upon completing a step, before moving on or ending the session. Future sessions depend entirely on this documentation being accurate — there is no other source of context.

## Current Status

See PROJECT_PLAN.md for implementation progress. Check the `[ ]` / `[x]` markers to see what has been completed.

## Development Principles

1. **Aggressive Simplicity**
   - Always prefer the simplest working solution.
   - Complexity should only be introduced when required (performance, maintainability, or feature necessity).
   - Avoid overengineering, speculative abstractions, or clever hacks.
   - Strive for clarity over cleverness.

2. **Don’t Repeat Yourself (DRY)**
   - Avoid duplication — if code is about to be repeated, factor it out into a reusable function or module.
   - Keep shared logic in a single source of truth to reduce maintenance cost.

3. **Prefer Functional Style**
   - Favor pure functions with no side effects where possible.
   - Compose small, focused functions rather than relying on large classes or inheritance.
   - Minimize mutability unless required for clarity or performance.

4. **Zero Tolerance for Broken Code**
   - Code must compile/build without errors.
   - No linting, formatting, or type errors allowed.
   - All tests must pass before code is considered complete.
   - Work-in-progress commits are acceptable, but merges must meet these standards.

5. **Production-Quality Expectations**
   - Code must be robust, maintainable, and secure.
   - Include appropriate error handling, input validation, and edge-case coverage.
   - Prioritize readability and maintainability — future contributors should be able to easily understand and extend the code.

6. **Highly Configurable**
   - As much as possible, features should be configurable via environment variable or configuration file

## Coding Style

- Follow project naming conventions (e.g. `camelCase` for variables/functions, `PascalCase` for types/classes).
- Prefer small, pure helper functions over large, monolithic blocks of logic.
- Avoid classes unless encapsulating state or behavior that clearly benefits from an object-oriented approach.
- **Use comments sparingly:**
  - Explain _why_ something unusual or non-obvious is being done.
  - Explain _what_ the code does only if it is necessarily complex and cannot be simplified further.
- Ensure all code is auto-formatted consistently using the project’s formatter/linter.

## Anti-Patterns to Avoid

- **Premature Optimization:** Don’t sacrifice clarity for speed unless performance is a proven bottleneck.
- **Unnecessary Abstractions:** Avoid layers of indirection, generic frameworks, or patterns that don’t clearly solve a real problem.
- **Global Mutable State:** Prefer passing data explicitly; global shared state makes code harder to reason about and test.
- **Magic Numbers & Strings:** Use named constants or enums for clarity and maintainability.
- **Silent Failures:** Don’t swallow errors; handle them explicitly or surface them clearly.
- **Commented-Out Code:** Remove dead code rather than leaving it commented. Git history preserves it.

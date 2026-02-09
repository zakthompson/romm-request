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
│   │   ├── components/    # Reusable UI components
│   │   ├── routes/        # TanStack Router file-based routes
│   │   ├── lib/           # Utilities, API client, hooks
│   │   └── main.tsx
│   └── package.json
├── server/                # Fastify backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic (IGDB, email, etc.)
│   │   ├── db/            # Drizzle schema, migrations
│   │   ├── plugins/       # Fastify plugins (auth, session, etc.)
│   │   └── index.ts
│   └── package.json
├── shared/                # Shared TypeScript types & constants
│   ├── src/
│   └── package.json
├── docker-compose.yml
├── Dockerfile
├── package.json           # Root workspace config
└── pnpm-workspace.yaml
```

## Key Architectural Decisions

- **pnpm workspaces** monorepo: `client`, `server`, `shared` packages
- **SQLite** — single file DB, no extra container, appropriate for low-traffic self-hosted use
- **Drizzle ORM** — lightweight, TypeScript-first, excellent SQLite support
- **Fastify** — lightweight but full-featured (built-in validation, plugins for OAuth/sessions/static)
- **OIDC/OAuth2** — app handles the OAuth flow directly with Authentik; admin users identified by Authentik group claim (configurable group name, e.g. `romm-admin`)
- **Subdirectory deployment** — runs behind SWAG at a configurable `BASE_PATH` (e.g. `/requests/`)
- **Production serving** — Fastify serves the built Vite frontend as static files

## Environment Variables

| Variable             | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `DATABASE_PATH`      | Path to SQLite database file (default: `./data/romm-request.db`) |
| `OIDC_ISSUER_URL`    | Authentik OIDC issuer URL                                        |
| `OIDC_CLIENT_ID`     | OAuth2 client ID                                                 |
| `OIDC_CLIENT_SECRET` | OAuth2 client secret                                             |
| `OIDC_REDIRECT_URI`  | OAuth2 callback URL                                              |
| `OIDC_ADMIN_GROUP`   | Authentik group name that grants admin access                    |
| `SESSION_SECRET`     | Secret for secure session encryption (min 32 chars)              |
| `IGDB_CLIENT_ID`     | Twitch/IGDB client ID                                            |
| `IGDB_CLIENT_SECRET` | Twitch/IGDB client secret                                        |
| `SMTP_HOST`          | SMTP server hostname                                             |
| `SMTP_PORT`          | SMTP server port                                                 |
| `SMTP_USER`          | SMTP username                                                    |
| `SMTP_PASS`          | SMTP password                                                    |
| `SMTP_FROM`          | From address for outbound emails                                 |
| `ADMIN_EMAIL`        | Admin email for new-request notifications                        |
| `BASE_PATH`          | Base URL path for subdirectory deployment (default: `/`)         |
| `APP_URL`            | Full public URL of the app (used in emails and redirects)        |
| `PORT`               | Server port (default: `3000`)                                    |

## Development Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Run client + server concurrently in dev mode
pnpm build                # Build all packages for production
pnpm start                # Start production server
pnpm db:migrate           # Run database migrations
pnpm db:studio            # Open Drizzle Studio for DB inspection
```

## Docker

```bash
docker compose up -d                  # Run with docker-compose
docker compose up -d --build          # Rebuild and run
```

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

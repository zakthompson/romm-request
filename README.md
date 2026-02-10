# RomM Request

A self-hosted web application for requesting games to be added to a [RomM](https://github.com/rommapp/romm) collection. Think Overseerr, but for ROMs.

Users search IGDB for games, select a platform, and submit requests. Admins review and fulfill or reject them, with optional email notifications.

## Features

- IGDB game search with cover art, summaries, and platform selection
- Request tracking with status updates (pending / fulfilled / rejected)
- Admin dashboard for managing all requests
- OIDC/OAuth2 authentication via Authentik (with admin role detection via group claims)
- Email notifications (new request to admin, status change to requester)
- Subdirectory deployment support (e.g. `https://example.com/requests/`)
- SQLite database (single file, no extra containers)
- Dark mode UI

## Quick Start (Docker)

1. **Clone and configure:**

   ```bash
   git clone https://github.com/your-user/romm-request.git
   cd romm-request
   cp .env.example .env
   ```

2. **Edit `.env`** with your configuration (see [Configuration](#configuration) below).

3. **Start:**

   ```bash
   docker compose up -d --build
   ```

   The app will be available at `http://localhost:3000` (or your configured `APP_URL`).

## Configuration

All configuration is via environment variables. See `.env.example` for defaults.

### Required

| Variable             | Description                                                                             |
| -------------------- | --------------------------------------------------------------------------------------- |
| `OIDC_ISSUER_URL`    | Authentik OIDC issuer URL (e.g. `https://auth.example.com/application/o/romm-request/`) |
| `OIDC_CLIENT_ID`     | OAuth2 client ID                                                                        |
| `OIDC_CLIENT_SECRET` | OAuth2 client secret                                                                    |
| `OIDC_REDIRECT_URI`  | OAuth2 callback URL (e.g. `https://example.com/api/auth/callback`)                      |
| `SESSION_SECRET`     | Min 32 characters, for session encryption                                               |
| `SESSION_SALT`       | Exactly 16 characters, for session key derivation                                       |
| `IGDB_CLIENT_ID`     | Twitch/IGDB client ID ([register here](https://dev.twitch.tv/console/apps))             |
| `IGDB_CLIENT_SECRET` | Twitch/IGDB client secret                                                               |

### Optional

| Variable           | Default                  | Description                                                 |
| ------------------ | ------------------------ | ----------------------------------------------------------- |
| `PORT`             | `3000`                   | Server port                                                 |
| `BASE_PATH`        | `/`                      | URL subdirectory (e.g. `/requests/`). **Requires rebuild.** |
| `APP_URL`          | `http://localhost:3000`  | Public URL (used in emails)                                 |
| `DATABASE_PATH`    | `./data/romm-request.db` | SQLite database file path                                   |
| `OIDC_ADMIN_GROUP` | `romm-admin`             | Authentik group name that grants admin access               |
| `SMTP_HOST`        | _(empty)_                | SMTP server (email disabled when unset)                     |
| `SMTP_PORT`        | `587`                    | SMTP port                                                   |
| `SMTP_USER`        | _(empty)_                | SMTP username                                               |
| `SMTP_PASS`        | _(empty)_                | SMTP password                                               |
| `SMTP_FROM`        | `noreply@{SMTP_HOST}`    | From address for emails                                     |
| `ADMIN_EMAIL`      | _(empty)_                | Admin email for new-request notifications                   |
| `DEV_AUTH`         | `false`                  | Enable dev login (ignored in production)                    |

### Subdirectory Deployment

To deploy at a subdirectory (e.g. `https://example.com/requests/`):

1. Set `BASE_PATH=/requests/` in your `.env`
2. Set `APP_URL=https://example.com`
3. Set `OIDC_REDIRECT_URI=https://example.com/requests/api/auth/callback`
4. **Rebuild** the Docker image: `docker compose up -d --build`

`BASE_PATH` is baked into the client build, so changing it requires a rebuild.

## Reverse Proxy (SWAG / Nginx)

Example SWAG nginx configs are included:

- `romm-request.subdomain.conf.example` — subdomain mode (e.g. `requests.example.com`)
- `romm-request.subfolder.conf.example` — subfolder mode (e.g. `example.com/requests/`)

Copy the appropriate file to your SWAG `nginx/proxy-confs/` directory and edit as needed.

## Authentik Setup

1. Create a new **OAuth2/OpenID Provider** in Authentik
2. Set the redirect URI to `https://yourdomain.com/api/auth/callback` (include `BASE_PATH` if set)
3. Create an **Application** linked to the provider
4. Create a **Group** (e.g. `romm-admin`) and add admin users to it
5. Set `OIDC_ADMIN_GROUP` to the group name

## Development

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start client + server in dev mode
pnpm build                # Build for production
pnpm check                # Run lint + format + typecheck
pnpm db:migrate           # Run database migrations
pnpm db:studio            # Open Drizzle Studio
```

## Tech Stack

- **Frontend**: React, TanStack Router/Query, Tailwind CSS v4, shadcn/ui, Vite
- **Backend**: Fastify, Drizzle ORM, better-sqlite3
- **Auth**: OIDC/OAuth2 via Authentik
- **Email**: Nodemailer (SMTP)
- **Language**: TypeScript (pnpm workspaces monorepo)

## License

MIT

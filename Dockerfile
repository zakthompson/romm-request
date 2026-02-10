FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build
FROM deps AS build
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}
COPY . .
RUN pnpm build

# Production
FROM base AS production
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/shared/package.json ./shared/
COPY --from=build /app/server/package.json ./server/
COPY --from=build /app/package.json ./

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

CMD ["node", "server/dist/index.js"]

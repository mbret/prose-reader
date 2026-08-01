# syntax=docker/dockerfile:1
#
# Build context is the repository root (this is a workspace app), so build it
# from there — or through the compose file next to this Dockerfile, which sets
# the context for you:
#
#   docker build -f apps/metadata-fetcher-api/Dockerfile --target production .
#
# Ignore rules live in `Dockerfile.dockerignore` beside this file so they stay
# scoped to this image instead of every build in the monorepo.

ARG NODE_VERSION=25-alpine

# ---------------------------------------------------------------------------
# deps — the workspace, installed. Only the package manifests are copied here,
# so editing source code doesn't invalidate the (slow) install layer.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps

WORKDIR /repo

# npm resolves the root `workspaces` globs against what is actually present,
# so shipping four workspaces out of sixteen is enough — the rest of the
# monorepo never enters the context.
COPY package.json package-lock.json lerna.json nx.json ./
COPY tsconfig.node.json tsconfig.web.json ./
COPY config config
COPY packages/shared/package.json packages/shared/
COPY packages/archive-reader/package.json packages/archive-reader/
COPY packages/metadata-fetcher/package.json packages/metadata-fetcher/
COPY apps/metadata-fetcher-api/package.json apps/metadata-fetcher-api/

# --ignore-scripts: the root `prepare` runs husky, which needs the .git this
# image deliberately does not carry
RUN npm ci --ignore-scripts --no-audit --no-fund

# ---------------------------------------------------------------------------
# build — the library the API serves. `lerna run build` follows the dependency
# graph, so shared and archive-reader are built first.
# ---------------------------------------------------------------------------
FROM deps AS build

COPY packages/shared packages/shared
COPY packages/archive-reader packages/archive-reader
COPY packages/metadata-fetcher packages/metadata-fetcher

RUN npx lerna run build --scope @prose-reader/metadata-fetcher

COPY apps/metadata-fetcher-api apps/metadata-fetcher-api

# ---------------------------------------------------------------------------
# development — what compose runs. Source is bind-mounted over these copies
# and node reloads on change; the library's own watcher runs as a sibling
# service (see docker-compose.yml).
# ---------------------------------------------------------------------------
FROM build AS development

ENV NODE_ENV=development
WORKDIR /repo/apps/metadata-fetcher-api

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# production — the image users run. Dev dependencies (vite, typescript,
# vitest…) are pruned away; node runs the app's TypeScript directly, so no
# bundling step stands between the source and what ships.
# ---------------------------------------------------------------------------
FROM build AS prune

RUN npm prune --omit=dev --ignore-scripts

FROM node:${NODE_VERSION} AS production

ENV NODE_ENV=production

COPY --from=prune --chown=node:node /repo /repo

WORKDIR /repo/apps/metadata-fetcher-api
USER node

EXPOSE 3000

# exec form: no shell parses this, so the quoting stays plain JSON
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "src/server.ts"]

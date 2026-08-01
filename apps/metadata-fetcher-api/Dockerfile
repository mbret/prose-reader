# syntax=docker/dockerfile:1
#
# The context is the repository root — this is a workspace app:
#
#   docker build -f apps/metadata-fetcher-api/Dockerfile --target production .
#
# Ignore rules are in `Dockerfile.dockerignore`, scoped to this image rather
# than every build in the monorepo.

ARG NODE_VERSION=25-alpine

# ---------------------------------------------------------------------------
# deps — manifests only, so editing source doesn't invalidate the slow install
# layer. npm resolves the root `workspaces` globs against what is present, so
# four workspaces out of sixteen is enough.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps

WORKDIR /repo

COPY package.json package-lock.json lerna.json nx.json ./
COPY tsconfig.node.json tsconfig.web.json ./
COPY config config
COPY packages/shared/package.json packages/shared/
COPY packages/archive-reader/package.json packages/archive-reader/
COPY packages/metadata-fetcher/package.json packages/metadata-fetcher/
COPY apps/metadata-fetcher-api/package.json apps/metadata-fetcher-api/

# --ignore-scripts: the root `prepare` runs husky, which needs a .git
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM deps AS sources

COPY packages/shared packages/shared
COPY packages/archive-reader packages/archive-reader
COPY packages/metadata-fetcher packages/metadata-fetcher
COPY apps/metadata-fetcher-api apps/metadata-fetcher-api

# ---------------------------------------------------------------------------
# development — what compose runs. Source is bind-mounted over these copies and
# node reloads on change, the API's and both libraries' alike: `prose-source`
# resolves archive-reader and metadata-fetcher to their TypeScript.
#
# Only shared needs building: archive-reader's source uses its debug Report.
# ---------------------------------------------------------------------------
FROM sources AS development

RUN npx lerna run build --scope @prose-reader/shared

ENV NODE_ENV=development
WORKDIR /repo/apps/metadata-fetcher-api

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# build — the library as consumers get it. Production runs the built entry, not
# the source condition, so the image exercises the artifact that ships.
# ---------------------------------------------------------------------------
FROM sources AS build

RUN npx lerna run build --scope @prose-reader/metadata-fetcher

# ---------------------------------------------------------------------------
# production — dev dependencies pruned, unprivileged, healthchecked. Node runs
# the app's TypeScript directly, so nothing is bundled on the way.
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

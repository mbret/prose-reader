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
# layer. pnpm resolves the `pnpm-workspace.yaml` globs against what is present
# and installs only those projects from the lockfile, so four workspaces out of
# twenty is enough.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps

WORKDIR /repo

# pnpm at exactly the version the repository pins in `packageManager`
COPY package.json ./
RUN npm install --global "$(node -p "require('./package.json').packageManager")"

COPY pnpm-lock.yaml pnpm-workspace.yaml lerna.json nx.json ./
COPY tsconfig.node.json tsconfig.web.json ./
COPY config config
COPY packages/shared/package.json packages/shared/
COPY packages/archive-reader/package.json packages/archive-reader/
COPY packages/metadata-fetcher/package.json packages/metadata-fetcher/
COPY apps/metadata-fetcher-api/package.json apps/metadata-fetcher-api/

# --ignore-scripts: the root `prepare` runs husky, which needs a .git
RUN pnpm install --frozen-lockfile --ignore-scripts

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

RUN pnpm exec lerna run build --scope @prose-reader/shared

ENV NODE_ENV=development
WORKDIR /repo/apps/metadata-fetcher-api

EXPOSE 6382

CMD ["pnpm", "run", "dev"]

# ---------------------------------------------------------------------------
# build — the library as consumers get it. Production runs the built entry, not
# the source condition, so the image exercises the artifact that ships.
# ---------------------------------------------------------------------------
FROM sources AS build

RUN pnpm exec lerna run build --scope @prose-reader/metadata-fetcher

# ---------------------------------------------------------------------------
# production — dev dependencies pruned, unprivileged, healthchecked. Node runs
# the app's TypeScript directly, so nothing is bundled on the way.
# ---------------------------------------------------------------------------
FROM build AS prune

# Reinstalling with --prod removes what only development needed; --offline
# because everything production keeps is already in this stage's store.
RUN pnpm install --prod --frozen-lockfile --offline --ignore-scripts

FROM node:${NODE_VERSION} AS production

ENV NODE_ENV=production

COPY --from=prune --chown=node:node /repo /repo

WORKDIR /repo/apps/metadata-fetcher-api
USER node

EXPOSE 6382

# exec form: no shell parses this, so the quoting stays plain JSON
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 6382) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "src/server.ts"]

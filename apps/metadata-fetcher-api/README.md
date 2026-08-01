# metadata-fetcher-api

A small HTTP service over [`@prose-reader/metadata-fetcher`](../../gitbook/metadata-fetcher/README.md): post what a book container told you, get back what the catalogs know.

It exists for two reasons — it is the development harness for the fetcher and its providers (hit a real catalog without wiring a script every time), and it is the easy way to run metadata lookups as a service without depending on the JavaScript package at all.

## Run it

```bash
# from the repository root — builds the image and starts the stack
npm run start:metadata-fetcher

curl "http://localhost:3000/metadata?title=Dune&author=Frank+Herbert"
```

Then open <http://localhost:3000> for the **playground**: a form (title, author, ISBN, plus the options) that runs a lookup and shows what came back — each candidate with its score, whether it was accepted, and the per-field signals behind it, with the raw entity a click away. It is the fastest way to see what a provider actually answers.

The playground is **development only**. It is served when `NODE_ENV` is anything but `production`, which the production image sets — so a hosted deployment has no HTML surface at all: `/` is a plain JSON 404 there, because the route is never registered rather than hidden behind a check. There is no flag to turn it back on.

Stop it with `npm run stop:metadata-fetcher`.

Source is bind-mounted into the container, so **editing the express app restarts it** (`node --watch`) and **editing the library rebuilds it** (a sibling `library` service runs the package's watch build into a shared volume, and the API restarts on the new build). No rebuild, no reinstall, nothing to run on the host.

Only working on the express app? `docker compose -f apps/metadata-fetcher-api/docker-compose.yml up api` skips the library watcher.

### Without Docker

```bash
npm run build --workspace @prose-reader/metadata-fetcher   # once
npm run dev --workspace prose-reader-metadata-fetcher-api  # node --watch
```

Node runs the app's TypeScript directly (type stripping), so there is no build step and no bundler between the source and what runs — in the container or out of it.

## Endpoints

### `GET /health`

Liveness, plus the providers this deployment exposes.

```json
{ "status": "ok", "providers": [{ "id": "openLibrary", "name": "Open Library" }] }
```

### `GET /metadata`

Human-friendly lookup, for curl and quick tries.

| Query | |
| --- | --- |
| `title` | |
| `author` | repeatable |
| `isbn`, `gtin` | |
| `publisher`, `series` | |
| `language` | repeatable |
| `year` | publication year |

```bash
curl "http://localhost:3000/metadata?isbn=9780441013593"
```

### `POST /metadata`

The integration path: the body is a `ResolvedArchive` — the output of `resolveArchive` — or a bare `ResolvedMetadata`. Options stay on the query string so the body remains a pure entity.

```bash
curl -X POST "http://localhost:3000/metadata?limit=3" \
  -H 'content-type: application/json' \
  -d '{"metadata":{"title":"Dune","contributors":[{"name":"Frank Herbert","roles":["author"]}]}}'
```

Fields a lookup cannot search on (`readingOrder`, `cover`, `properties`, the format-scoped corners…) are ignored rather than rejected, so a whole resolved archive can be posted verbatim.

### Options (both metadata routes)

| Query | Default | |
| --- | --- | --- |
| `limit` | `METADATA_LIMIT` | matches kept per provider, 1–50 |
| `minScore` | `METADATA_MIN_SCORE` | confidence a match needs to be `accepted`, 0–1 |
| `includeRaw` | `false` | keep each provider's own record on `match.raw` |
| `providers` | all | comma-separated provider ids to narrow the lookup |

Both answer with the `FetchedMetadata` entity verbatim — merged `metadata`, ranked `matches` with the per-field signals behind each score, per-provider `sources`, and `failedProviders`. See the [package documentation](../../gitbook/metadata-fetcher/README.md) for the entity and the matching rules.

### Status codes

| | |
| --- | --- |
| `200` | a lookup happened — including "found nothing", and including a partial one where some catalogs failed (they are named in `failedProviders`) |
| `400` | no search term, an invalid option, an unknown provider id, or a body that is not a JSON object |
| `404` | unknown route |
| `502` | every provider that could be asked failed — the body still names them |
| `504` | the lookup outlived `REQUEST_TIMEOUT_MS` |

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `3000` | |
| `METADATA_LIMIT` | `5` | default `limit` |
| `METADATA_MIN_SCORE` | `0.5` | default `minScore` |
| `REQUEST_TIMEOUT_MS` | `10000` | budget for one lookup across every provider |
| `OPEN_LIBRARY_USER_AGENT` | — | **set this**: Open Library asks API clients to identify themselves (app name + contact) and throttles anonymous traffic harder |
| `OPEN_LIBRARY_BASE_URL` | `https://openlibrary.org` | override to point at a mirror or a stub |
| `OPEN_LIBRARY_COVERS_BASE_URL` | `https://covers.openlibrary.org` | |
| `NODE_ENV` | — | `production` drops the playground page; both Docker targets set it for you |

A malformed value fails the boot rather than silently falling back — a typo'd `PORT` that quietly serves on 3000 is much harder to notice than a container that refuses to start.

{% hint style="info" %}
Behind an HTTP proxy, set `NODE_USE_ENV_PROXY=1`: Node's global `fetch` ignores `HTTP_PROXY`/`HTTPS_PROXY` unless asked to honor them.
{% endhint %}

## Deploying it

The `production` target is the image to ship: dev dependencies pruned, running as the unprivileged `node` user, with a `HEALTHCHECK` that polls `/health`.

```bash
docker build -f apps/metadata-fetcher-api/Dockerfile --target production -t prose-metadata-fetcher .
docker run -p 3000:3000 -e OPEN_LIBRARY_USER_AGENT="MyApp/1.0 (me@example.com)" prose-metadata-fetcher
```

The build context is the repository root (this is a workspace app). Only the four workspaces the image needs enter the context — see `Dockerfile.dockerignore`.

The service is stateless: no database, no cache, nothing on disk. Scale it by running more of it, and put your own cache in front if you expect repeat lookups — catalogs appreciate it.

# metadata-fetcher-api

A small HTTP service over [`@prose-reader/metadata-fetcher`](../../gitbook/metadata-fetcher/README.md): post a compact book lookup input, get back what the catalogs know.

It exists for two reasons — it is the development harness for the fetcher and its providers (hit a real catalog without wiring a script every time), and it is the easy way to run metadata lookups as a service without depending on the JavaScript package at all.

## Run it

```bash
# from the repository root — builds the image and starts the stack
npm run start:metadata-fetcher

curl "http://localhost:3000/metadata?title=Dune&author=Frank+Herbert"
```

Then open <http://localhost:3000> for the **playground**. Enter a title, author and ISBN, or choose an EPUB/CBZ/ZIP publication: the file is read in memory with `@prose-reader/archive-reader`, closed as soon as its metadata is resolved, and converted to the compact lookup input posted to `/metadata`. The playground imposes no application-level file-size limit and neither the file nor the input is written to disk, browser storage, a database or a cache.

The playground shows what came back — each candidate with its score, whether it was accepted, and the per-field signals behind it, with the raw entity a click away. It is the fastest way to see what a provider actually answers.

The playground is **development only**. It is served when `NODE_ENV` is anything but `production`, which the production image sets — so a hosted deployment has no HTML surface at all: `/` is a plain JSON 404 there, because the route is never registered rather than hidden behind a check. There is no flag to turn it back on.

Stop it with `npm run stop:metadata-fetcher`.

Both the app's source and the library's are bind-mounted into the container, and node runs both as TypeScript — so **editing either restarts the server** (`node --watch`), with no build, no watcher and nothing to run on the host. Editing `playground.html` needs not even a restart: it is read from disk per request, so a refresh is enough.

### Without Docker

```bash
npm run dev --workspace prose-reader-metadata-fetcher-api
```

### No build, anywhere in development

Node runs TypeScript directly (type stripping), and that goes for both libraries too: `@prose-reader/archive-reader` and `@prose-reader/metadata-fetcher` declare `prose-source` export conditions pointing at their source entry points, so `node --conditions=prose-source` — what `npm run dev` and the compose service both run — loads their TypeScript instead of `dist`. This includes archive-reader's zip.js creator used by playground uploads.

The same condition is set for the typechecker (`customConditions` in `tsconfig.json`) and for the tests (`resolve.conditions` in `vitest.config.ts`), so running, typechecking and testing all agree and none of them needs the package built.

The condition is inert for anyone else: nothing applies it unless asked, and normal package consumers resolve `dist` as usual. The production image resolves `dist` too — it should exercise the artifact that actually ships.

## Endpoints

### `GET /health`

Liveness, plus the providers this deployment exposes.

```json
{
  "status": "ok",
  "providers": [
    { "id": "projectGutenberg", "name": "Project Gutenberg" },
    { "id": "openLibrary", "name": "Open Library" }
  ]
}
```

### `GET /metadata`

Human-friendly lookup, for curl and quick tries.

| Query | |
| --- | --- |
| `title` | |
| `author` | repeatable |
| `isbn`, `gtin` | |
| `series` | |
| `language` | repeatable |
| `publisher` | publisher matching evidence |
| `publishedYear` | publication year matching evidence |

```bash
curl "http://localhost:3000/metadata?isbn=9780441013593"
```

### `POST /metadata`

The integration path: the body is a `FetchMetadataInput`. Options stay on the query string so the body remains a pure lookup description.

```bash
curl -X POST "http://localhost:3000/metadata?limit=3" \
  -H 'content-type: application/json' \
  -d '{"title":"Dune","authors":["Frank Herbert"],"publishedYear":1965}'
```

Supported fields are `title`, `authors`, `isbn`, `gtin`, `identifiers`, `series`, `publisher`, `publishedYear`, `languages` and `numberOfPages`. Unknown fields are ignored. JavaScript callers starting with archive-reader can use `metadataInputFromResolvedArchive(resolved)` before posting the result.

### Options (both metadata routes)

| Query | Default | |
| --- | --- | --- |
| `limit` | `METADATA_LIMIT` | matches kept per provider, 1–50 |
| `minScore` | `METADATA_MIN_SCORE` | confidence a match needs to be `accepted`, 0–1 |
| `includeRaw` | `false` | keep each provider's own record on `match.raw` |
| `providers` | all | comma-separated provider ids to narrow the lookup |

Both answer with the `FetchedMetadata` entity verbatim — ranked `matches` with the per-field signals behind each score, per-provider `sources`, and `failedProviders`. Matches are alternatives and are not consolidated into a synthetic metadata record. See the [package documentation](../../gitbook/metadata-fetcher/README.md) for the entity and the matching rules.

### Status codes

| | |
| --- | --- |
| `200` | a lookup happened — including "found nothing", and including a partial one where some catalogs failed (they are named in `failedProviders`, with the HTTP status they answered with) |
| `400` | no search term, an invalid option, an unknown provider id, or a body that is not a JSON object |
| `404` | unknown route |
| `502` | every provider that could be asked failed — the body still names them and the status each answered with, so a `429` reads as "come back later" rather than "broken" |
| `504` | the lookup outlived `REQUEST_TIMEOUT_MS` |

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `3000` | |
| `METADATA_LIMIT` | `5` | default `limit` |
| `METADATA_MIN_SCORE` | `0.5` | default `minScore` |
| `REQUEST_TIMEOUT_MS` | `10000` | budget for one lookup across every provider |
| `PROJECT_GUTENBERG_USER_AGENT` | — | optional identifying user agent for exact RDF lookups |
| `PROJECT_GUTENBERG_BASE_URL` | `https://www.gutenberg.org` | absolute HTTP(S) origin; override to point at a mirror or a stub |
| `OPEN_LIBRARY_USER_AGENT` | — | **set this**: Open Library asks API clients to identify themselves (app name + contact) and throttles anonymous traffic harder |
| `OPEN_LIBRARY_BASE_URL` | `https://openlibrary.org` | override to point at a mirror or a stub |
| `OPEN_LIBRARY_COVERS_BASE_URL` | `https://covers.openlibrary.org` | |
| `NODE_ENV` | — | `production` drops the playground page; both Docker targets set it for you |

A malformed value fails the boot rather than silently falling back — a typo'd `PORT` that quietly serves on 3000 is much harder to notice than a container that refuses to start.

{% hint style="info" %}
Behind an HTTP proxy, set `NODE_USE_ENV_PROXY=1`: Node's global `fetch` ignores `HTTP_PROXY`/`HTTPS_PROXY` unless asked to honor them.
{% endhint %}

## Deploying it

Every release publishes the image to Docker Hub, tagged with the version and `latest`:

```bash
docker run -p 3000:3000 \
  -e OPEN_LIBRARY_USER_AGENT="MyApp/1.0 (me@example.com)" \
  mbret/prose-metadata-fetcher-api:latest
```

It is built for `linux/amd64` and `linux/arm64`. The `production` target it comes from has dev dependencies pruned, runs as the unprivileged `node` user, and carries a `HEALTHCHECK` polling `/health`.

To build it yourself:

```bash
docker build -f apps/metadata-fetcher-api/Dockerfile --target production -t prose-metadata-fetcher .
```

The build context is the repository root (this is a workspace app). Only the four workspaces the image needs enter the context — see `Dockerfile.dockerignore`.

CI builds the same target on every pull request and smoke-tests it — it boots the container, checks `/health`, and asserts `/` answers `404`, so the "no playground when hosted" property is enforced rather than trusted.

The service is stateless: no database, no cache, nothing on disk. Scale it by running more of it, and put your own cache in front if you expect repeat lookups — catalogs appreciate it.

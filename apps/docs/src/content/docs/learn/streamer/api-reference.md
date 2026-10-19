---
title: "API Reference"
---

The public surface of `@prose-reader/streamer`. Everything below is exported from the package root (`@prose-reader/streamer`) unless a **subpath** is called out explicitly.

```typescript
import {
  generateManifestFromArchive,
  generateResourceFromArchive,
} from "@prose-reader/streamer"
```

The package splits into a few areas. Archives and hooks have dedicated guides — this page is the canonical index of what is exported and documents the pieces that don't have a page of their own (manifest/resource generation and the streaming classes).

| Area | Exports | Where |
| --- | --- | --- |
| Manifest & resources | `generateManifestFromArchive`, `generateResourceFromArchive`, `createManifestResourceHref` | below |
| Streaming | `Streamer`, `ServiceWorkerStreamer` | below · [Node](/learn/streamer/node) · [Service Worker](/learn/streamer/service-worker) · [Web (dom)](/learn/streamer/web-dom) |
| Hooks | `StreamerHooks`, `StreamerManifestHook*`, `StreamerResourceHook*`, `HookResource` types | [Hooks](/learn/streamer/hooks) |
| Setup | `configure` | below |

## Archives

The streamer *consumes* archives, it does not create or understand them: the `Archive` type, the `createArchiveFrom*` creators, the file-accessor factories, the lookup helpers, and the whole resolve layer ([`resolveArchive`](/archive-reader#resolving-a-publication), [`resolveArchiveReadingOrder`](/archive-reader#resolving-the-reading-order), [`resolveArchiveToc`](/archive-reader#resolving-a-table-of-contents), the [`ResolvedMetadata`](/archive-reader/resolved-metadata) vocabulary) all live in **`@prose-reader/archive-reader`** and are covered in full on the [Archive Reader](/archive-reader) page. Building an [`Archive`](/archive-reader#the-archive-contract) is always the first step, whatever the source.

Generic string helpers previously exported here (`createXmlSafeId`, `createUniqueXmlSafeId`, `createXmlSafeIdFactory`, `sortByTitleComparator`, `removeTrailingSlash`, `getUriBasename`, `getUriBasePath`) moved to **`@prose-reader/shared`**.

## Manifest & resource generation { #manifest-and-resource-generation }

### `generateManifestFromArchive(archive, options?)` { #generatemanifestfromarchive-archive-options }

```typescript
generateManifestFromArchive(
  archive: Archive,
  options?: { baseUrl?: string; hooks?: StreamerManifestHookFactory[] },
): Promise<Manifest>
```

Produces a reader [`Manifest`](/learn/contract): the archive is resolved by `@prose-reader/archive-reader`'s [`resolveArchive`](/archive-reader#resolving-a-publication) (with the viewport `layoutScan` enabled), mapped into serving space (`baseUrl` rebasing, XML-safe ids, guide passthrough, audiobook/folder toc), then handed to any user [hooks](/learn/streamer/hooks) before the final defaults. The manifest keeps two facts from the container: its `mediaType`, the media type of the book file as [`resolveArchive`](/archive-reader#resolving-a-publication) resolves it, and each spine item's `containerUri`, the path of the archive record it shows, with no serving base.

```typescript
import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { generateManifestFromArchive } from "@prose-reader/streamer"

const archive = await createArchiveFromJszip(zip)
const manifest = await generateManifestFromArchive(archive)
```

### `generateResourceFromArchive(archive, resourcePath, options?)` { #generateresourcefromarchive-archive-resourcepath-options }

```typescript
generateResourceFromArchive(
  archive: Archive,
  resourcePath: string,
  options?: { hooks?: StreamerResourceHookFactory[] },
): Promise<HookResource> // resolved resource with a guaranteed `body` (string | Blob)
```

Resolves a single archive resource by URI, running it through the resource hook pipeline (default / self-closing-tags / css / calibre fixes, plus any user hooks) and falling back to the raw file blob when no hook sets a body.

### `createManifestResourceHref({ baseUrl?, resourcePath })` { #createmanifestresourcehref-baseurl-resourcepath }

```typescript
createManifestResourceHref(params: {
  baseUrl?: string // default ""
  resourcePath: string
}): string
```

Builds the `href` used for a manifest resource. An absolute `http(s)://` `resourcePath` is returned untouched (when no `baseUrl` is given); otherwise the path is prefixed with `baseUrl` (a trailing `/` is added when missing) or with `file://` when no `baseUrl` is provided. The result is always passed through `encodeURI`, and `#`/`?` characters appearing in the resource path itself are additionally escaped (`%23`/`%3F`) — in an archive filename they are data, not fragment/query delimiters.

```typescript
import { createManifestResourceHref } from "@prose-reader/streamer"

createManifestResourceHref({ resourcePath: "OEBPS/chapter-1.xhtml" })
// "file://OEBPS/chapter-1.xhtml"

createManifestResourceHref({ baseUrl: "https://cdn.example.com/book", resourcePath: "OEBPS/chapter-1.xhtml" })
// "https://cdn.example.com/book/OEBPS/chapter-1.xhtml"
```

## Streaming

The streaming classes turn manifest and resource requests into HTTP `Response`s. See [Node](/learn/streamer/node), [Web (dom)](/learn/streamer/web-dom) and [Service Worker](/learn/streamer/service-worker) for end-to-end setups.

### `Streamer`

```typescript
new Streamer(options: {
  // archive loader options (how archives are created/cached by key)
  hooks?: StreamerHooks
  onError?: (error: unknown) => Response
  onManifestSuccess?: (params: { manifest: Manifest; archive: Archive })
    => Observable<Manifest> | Promise<Manifest>
})

streamer.fetchManifest(params: { key: string; baseUrl?: string }): Promise<Response>
streamer.fetchResource(params: { key: string; resourcePath: string; request?: Request }): Promise<Response>
streamer.accessArchive(key: string): Observable<{ archive: Archive; release: () => void }>
streamer.accessArchiveWithoutLock(key: string): Observable<Archive>
streamer.prune(): void
```

Core archive-serving engine: it loads and caches archives by `key` and generates the matching `Response`s. `fetchManifest` / `fetchResource` produce the manifest and resource responses (resource responses support HTTP range requests); `accessArchive` acquires a locked archive handle you release with `release()`; `accessArchiveWithoutLock` yields just the archive and releases immediately; `prune` purges the archive cache.

### `ServiceWorkerStreamer`

```typescript
new ServiceWorkerStreamer(options: /* Streamer options */ & {
  getUriInfo: (event: FetchEvent) => { baseUrl: string } | undefined
})

serviceWorkerStreamer.fetchEventListener(event: FetchEvent): void
```

A `Streamer` subclass for service-worker `fetch` events. `getUriInfo` maps a request to its `baseUrl` (or `undefined` to ignore the request); the bound `fetchEventListener` parses the request URL into `{ key, resourcePath }` and calls `event.respondWith` using `fetchManifest` (for `/manifest` URLs) or `fetchResource` otherwise.

## Setup

### Debug logging

Internal `Report` logging auto-configures from the `globalThis.__PROSE_READER_DEBUG` flag (set it to `true` or `"true"`). The flag is read from `globalThis`, so it also works where `window` does not exist — service workers, web workers, node — as long as it is set before the prose-reader modules evaluate (e.g. an early side-effect import in a worker bundle). This is how every package's logging is enabled, `@prose-reader/archive-reader` included.

### `configure(options?)` { #configure-options }

```typescript
configure(options?: { enableReport?: boolean }): void
```

Explicit toggle for the streamer's own `Report` logging, for setups where the global flag cannot be set early enough (it force-enables or force-disables regardless of the flag).

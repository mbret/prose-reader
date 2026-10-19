---
title: "Streamer in a service worker"
description: "Serve EPUB and comic books from a service worker with ServiceWorkerStreamer, so the reader fetches every chapter, image and stylesheet from a URL."
sidebar:
  label: "Service Worker"
---

## Why a service worker

A [streamer](/learn/streamer) turns an archive into a manifest and the resources it lists. In a service worker, it gives each of those resources a URL on your origin. The reader fetches these URLs itself, as it does by default, and the images and stylesheets a chapter loads go through the worker too.

The archive work also moves off the page's main thread. Unlike [streaming from the page](/learn/streamer/web-dom), the reader needs no `getResource` option.

## How requests are routed

`ServiceWorkerStreamer` is a [`Streamer`](/learn/streamer/api-reference#streamer) that answers `fetch` events. It takes the same options, plus `getUriInfo`. That function receives each event and returns the `baseUrl` the streamer serves under, or `undefined` to leave the request alone. Under that base, the first path segment is the key the streamer passes to `getArchive`:

| Request | Response |
| --- | --- |
| `<baseUrl>/<key>/manifest` | The manifest of the archive, its `href`s under `<baseUrl>/<key>/` |
| `<baseUrl>/<key>/<path>` | The resource at `<path>` in the archive, range requests included |
| Anything `getUriInfo` returns `undefined` for | Not answered by the streamer |

Use a key made of letters, digits, `-`, `_` and `.`, such as a book id. The key is one path segment, and the streamer passes some `href`s through `encodeURI`, so a key that needs percent-encoding would not reach `getArchive` unchanged.

## The service worker

This worker serves the books stored as `/books/<id>.epub` under `/streamer/<id>/`:

```typescript
/// <reference lib="webworker" />
import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { ServiceWorkerStreamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"

declare const self: ServiceWorkerGlobalScope

const streamer = new ServiceWorkerStreamer({
  // The streamer answers the requests under /streamer/, the others go on as usual
  getUriInfo: (event) => {
    const url = new URL(event.request.url)

    if (!url.pathname.startsWith("/streamer/")) return undefined

    return { baseUrl: `${url.origin}/streamer` }
  },
  // The key is a book id: /streamer/moby-dick/... serves /books/moby-dick.epub
  getArchive: async (key) => {
    const response = await fetch(`/books/${key}.epub`)

    if (!response.ok) {
      throw new Error(`No book for ${key}`)
    }

    return createArchiveFromJszip(await loadAsync(await response.blob()))
  },
})

// Activate at once and take control of the open pages, including the one
// that registered the worker
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", streamer.fetchEventListener)
```

`getArchive` returns an [`Archive`](/archive-reader#the-archive-contract), so the book can come from anywhere the worker can read: the network, the Cache API or IndexedDB. When it throws, the request gets the response of `onError`, a 500 by default.

The other options are those of [`Streamer`](/learn/streamer/api-reference#streamer):

- `hooks` transform the manifest and the resources, see [Streamer hooks](/learn/streamer/hooks). For comic archives, add the hooks of [`@prose-reader/cbz`](/enhancers/cbz-and-comics-archives).
- `cleanArchiveAfter` sets how long an unused archive stays open, see [How long an archive stays open](#how-long-an-archive-stays-open).
- `onError` and `onManifestSuccess` replace the error response and post-process the manifest.

To see the streamer's logs, set `globalThis.__PROSE_READER_DEBUG` before any prose package loads in the worker, as the first import of the demo's worker does. See [Debug logging](/learn/streamer/api-reference#debug-logging).

## Registering the worker

The worker imports packages, so build it into a script of its own. The demo builds it with `vite-plugin-pwa` and registers the result as `/service-worker.js`.

Serve that script from the root of your site, which gives the worker the `/` scope. The scope has to cover two things: the page that shows the reader, so that its requests reach the worker, and the `/streamer/` URLs, which the reader opens in frames.

The page that registers the worker is not controlled by it until the worker claims it, which the worker above does when it activates. Wait for that before the first request:

```typescript
const waitForServiceWorker = async () => {
  await navigator.serviceWorker.register("/service-worker.js")

  if (navigator.serviceWorker.controller) return

  await new Promise((resolve) => {
    navigator.serviceWorker.addEventListener("controllerchange", resolve, {
      once: true,
    })
  })
}
```

## Opening a book

The page fetches the manifest from the worker and creates the reader with it:

```typescript
import { createReader, type Manifest } from "@prose-reader/core"

const openBook = async (bookId: string, container: HTMLElement) => {
  await waitForServiceWorker()

  const response = await fetch(`/streamer/${bookId}/manifest`)

  if (!response.ok) {
    throw new Error(`The streamer could not open ${bookId}`)
  }

  const manifest: Manifest = await response.json()
  const reader = createReader({ manifest })

  reader.mount(container)

  return reader
}
```

Leave `getResource` out. The manifest's `href`s point at the worker, and the reader fetches them itself. A `getResource` that returns a document makes the reader load it from the page instead of its URL, and the requests made inside it can then miss the worker.

A reader shows a single book: destroy it with `reader.destroy()` before you open the next one, as in [Getting started](/get-started/getting-started).

## How long an archive stays open

The worker keeps an archive open while requests use it, and closes it:

- when a request for another key comes in, once nothing uses the previous archive;
- when no request has used it for `cleanArchiveAfter` milliseconds, 5 minutes by default.

The next request for a closed archive calls `getArchive` again. So does the first request after the browser stops an idle worker, which loses every archive it held. If the book comes from the network, a copy in the Cache API or IndexedDB saves downloading it again.

## PDF

:::caution
A service worker cannot serve PDF documents, see the [PDF enhancer](/enhancers/pdf). The demo opens its PDFs with a `Streamer` in the page and serves its other books from its worker.
:::

## A complete example

The [demo](/get-started/demo-and-showcase) runs this setup, for EPUB, comics, plain text and the books a user uploads, which it stores with localforage. See its [service worker](https://github.com/mbret/prose-reader/tree/master/apps/front/src/demo/serviceWorker) and its [streamers](https://github.com/mbret/prose-reader/tree/master/apps/front/src/demo/streamer).

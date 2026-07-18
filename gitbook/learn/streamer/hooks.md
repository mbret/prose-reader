# Hooks

Streamer hooks let you transform what the streamer produces without forking its pipeline. There are two hook points, both passed wherever the streamer is set up (`new Streamer({ hooks })`, `new ServiceWorkerStreamer({ hooks })`, or directly to `generateManifestFromArchive` / `generateResourceFromArchive`):

```typescript
type StreamerHooks = {
  manifest?: StreamerManifestHookFactory[]
  resource?: StreamerResourceHookFactory[]
}
```

## Manifest hooks

An ordered list of `Manifest` transforms. All book-format understanding (OPF/ComicInfo/Apple/Kobo precedence, the viewport layout scan, spine rules) happens in `@prose-reader/archive-reader`'s `resolveArchive` before your hooks run, so there is a single hook point: your hooks receive the **fully mapped manifest** (hrefs rebased onto the `baseUrl`, toc attached) and run just **before the final defaults** — an unset `readingDirection` only falls back to `ltr` after every hook ran, so a hook can still detect "no source decided it".

```typescript
import type { StreamerManifestHookFactory } from "@prose-reader/streamer"

const forceLandscapeSpreads: StreamerManifestHookFactory =
  ({ archive, baseUrl }) =>
  (manifest) => ({
    ...manifest,
    renditionSpread: "landscape",
  })

const streamer = new Streamer({
  hooks: { manifest: [forceLandscapeSpreads] },
  // ...
})
```

Each factory receives `{ archive, baseUrl }` and returns the transform; transforms may be async and run in list order. The `@prose-reader/cbz` package ships ready-made ones (reading-direction detection, panorama splitting) as `streamerHooks.manifest`.

{% hint style="warning" %}
Before v2 of the streamer, manifest hooks were split into `content`/`spine`/`presentation`/`navigation` phases interleaved with built-in format hooks. That taxonomy is gone — pass a single ordered array instead.
{% endhint %}

## Resource hooks

Resource hooks transform individual resource responses (`HookResource`: `{ body?, params: { contentType? } }`). The streamer applies its built-in fixes this way (calibre quirks, CSS adjustments, self-closing-tag normalization) and your hooks run on top:

```typescript
import type { StreamerResourceHookFactory } from "@prose-reader/streamer"

const textPlainEverything: StreamerResourceHookFactory =
  ({ archive, resourcePath }) =>
  (resource) => ({
    ...resource,
    params: { ...resource.params, contentType: "text/plain" },
  })
```

# CBZ & comics archives

`@prose-reader/cbz` extends some support related to comics archives (not just .cbz). If your reader is serving epub files you may skip this package as its purpose is to bridge the gap between a comics archive and epub compliances.

## Feature overview

* Page spread splitting

### Getting started

Install the CBZ package alongside the reader, streamer and archive-reader packages used by your application.

```sh
npm install @prose-reader/cbz @prose-reader/core @prose-reader/streamer @prose-reader/archive-reader
```

Wrap the reader with `cbzEnhancer`:

```ts
import { cbzEnhancer } from "@prose-reader/cbz"
import { createReader } from "@prose-reader/core"

export const createComicReader = cbzEnhancer(createReader)
```

Add the CBZ streamer hooks to the streamer that serves your archive resources:

```ts
import { streamerHooks } from "@prose-reader/cbz"
import {
  ServiceWorkerStreamer,
} from "@prose-reader/streamer"

export const streamer = new ServiceWorkerStreamer({
  hooks: {
    // streamerHooks.manifest is an ordered array (reading-direction
    // detection, then the panorama split). If you merge in your own
    // manifest hooks, keep that relative order.
    manifest: streamerHooks.manifest,
    resource: streamerHooks.resource,
  },
  // ...
})
```

`streamerHooks` already matches the streamer's `hooks` shape, so if the CBZ hooks are the only ones you need you can pass it straight through as `hooks: streamerHooks`.

### Page spread splitting

When a CBZ image filename looks like a two-page spread, the manifest hook can replace that single image spine item with two virtual XHTML spine items. For left-to-right books, the left crop is exposed before the right crop. For right-to-left books, the order is reversed so manga-style navigation remains correct.

{% hint style="warning" %}
`streamerHooks.manifest` includes `detectReadingDirectionManifest`, which runs before the split and defaults comic archives to **right-to-left** (manga order) when nothing earlier decided a direction. It only fills an *undecided* `readingDirection`, so anything resolved upstream wins: `ComicInfo.xml`'s reading direction (now resolved automatically by `@prose-reader/archive-reader`), a user setting, or a custom manifest hook placed before it. To force left-to-right on a comic that would otherwise default to RTL, set `readingDirection: "ltr"` before these hooks run.
{% endhint %}

For example, `p006-007.jpg` can produce:

* a virtual XHTML item for page `006`;
* a virtual XHTML item for page `007`;
* CFI mappings that still point back to `p006-007.jpg` externally.

The generated XHTML references the original image and crops it with CSS. This keeps the archive unchanged while giving the reader separate page resources to layout and navigate. Additionally the generated CFI is valid for the archive and can be used in other readers.

### Detecting split pages at runtime

The enhancer exposes `reader.cbz.isPanoramaSpineItem` which tells whether a spine item is one of the two virtual pages produced by page spread splitting. This is useful to adapt your UI when the current page is half of a panorama (for example, suggesting a device rotation so the full spread becomes visible):

```ts
const spineItem = reader.spineItemsManager.get(0)

if (spineItem && reader.cbz.isPanoramaSpineItem(spineItem)) {
  // the page is one of the two halves of a split panorama
}
```

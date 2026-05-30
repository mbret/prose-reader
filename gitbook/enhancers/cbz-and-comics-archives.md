# CBZ & comics archives

`@prose-reader/cbz` extends some support related to comics archives (not just .cbz). If your reader is serving epub files you may skip this package as its purpose is to bridge the gap between a comics archive and epub compliances.

## Feature overview

* Page spread splitting

### Getting started

Install the CBZ package alongside the reader and streamer packages used by your application.

```sh
npm install @prose-reader/cbz @prose-reader/core @prose-reader/streamer
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
    manifest: {
      spine: streamerHooks.manifest.spine,
    },
    resource: streamerHooks.resource,
  },
  // ... 
})
```

### Page spread splitting

When a CBZ image filename looks like a two-page spread, the manifest hook can replace that single image spine item with two virtual XHTML spine items. For left-to-right books, the left crop is exposed before the right crop. For right-to-left books, the order is reversed so manga-style navigation remains correct.

{% hint style="warning" %}
The CBZ package does not detect reading direction. It uses the manifest `readingDirection` available when the streamer spine hook runs. If no earlier metadata or hook sets a direction, the default manifest direction is left-to-right.

Applications that need RTL comic handling should set `readingDirection: "rtl"` before the CBZ spine hook runs, for example from `ComicInfo.xml`, filename conventions, user settings, or a custom streamer manifest hook.
{% endhint %}

For example, `p006-007.jpg` can produce:

* a virtual XHTML item for page `006`;
* a virtual XHTML item for page `007`;
* CFI mappings that still point back to `p006-007.jpg` externally.

The generated XHTML references the original image and crops it with CSS. This keeps the archive unchanged while giving the reader separate page resources to layout and navigate. Additionally the generated CFI is valid for the archive and can be used in other readers.

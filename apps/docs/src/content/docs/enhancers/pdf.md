---
title: "PDF enhancer"
description: "Set up @prose-reader/enhancer-pdf with pdf.js: the pdfjs-dist version to install, the worker, createArchiveFromPdf, and why PDFs stay out of a service worker."
sidebar:
  label: "PDF"
---

This enhancer lets you render PDF documents. The reason it's not part of the core is because PDFs require an extra dependency and have a rather specific & much different way to be rendered. Having it as a core would increase the core size significantly and increase complexity while not everyone needs to render pdf.

:::caution
PDFs are incompatible with service workers due to the limitation from the library used [https://mozilla.github.io/pdf.js/](https://mozilla.github.io/pdf.js/). The archive, resources and rendering will all happen on the client side. There is nothing wrong with it except that it cannot be in your service worker streamer flow (if you use this flow).
:::

## Important

The enhancer renders each spine item whose container path ends in `.pdf`, unless a `getRenderer` you pass gives a renderer for it. It reads the pages from the archive `getArchiveForItem` gives, so none of them is fetched through an HTTP request. The `getResource` you pass to the reader serves every other item.

The archive must stay open until the reader is destroyed. The enhancer calls `getArchiveForItem` and subscribes when it first reads a page of an item, and again on the next read after it errors. It unsubscribes when the reader is destroyed, so `Streamer.accessArchive` holds the archive exactly that long. Closing an archive made by `createArchiveFromPdf` destroys its pdf.js document and the worker pdf.js started for it.

## Getting started

:::note
We encourage you to visit the [prose reader demo](https://github.com/mbret/prose-reader/tree/master/apps/front/src/demo) to see how the enhancer is being used in a real world example.
:::

```bash
npm install @prose-reader/enhancer-pdf @prose-reader/core @prose-reader/archive-reader rxjs "pdfjs-dist@>=6.2.108 <7"
```

All four are peer dependencies, `pdfjs-dist` in the `>=6.2.108 <7` range. The floor
is the patched release, not the major: every `pdfjs-dist` from `5.6.83` up to but
excluding `6.2.108` is affected by
[GHSA-hq66-cqwq-w95j](https://github.com/advisories/GHSA-hq66-cqwq-w95j), which
lets a malicious PDF execute arbitrary JavaScript, and that range includes `6.0.x`
and `6.1.x`. `pdfjs-dist` 6 also requires Node `>=22.13`.

The following integration example is simplified and does not use streamers. The prose reader demo uses a client streamer to streamline the process and have a more unified way to stream documents but it's not required. Since the package provides an archive creator helper it can be used as any other archives.

```typescript
import { createReader } from "@prose-reader/core"
import { createArchiveFromPdf, pdfEnhancer } from "@prose-reader/enhancer-pdf"
import { generateManifestFromArchive } from "@prose-reader/streamer"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
// You need to import inline the css of the pdf viewer. It is needed
// by the enhancer to inject it in the document and have annotation layer.
// The css is big so we don't embed it in the source code.
import pdfjsViewerInlineCss from "pdfjs-dist/web/pdf_viewer.css?inline"
import { of } from "rxjs"

// Initialize the pdfjs worker somewhere in your code.
// Something like an index file or your streamer may be a good idea. Please check
// https://mozilla.github.io/pdf.js/
// for more information. Below is an example with vite bundler.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  pdfWorkerUrl,
  import.meta.url,
).toString()

const createAppReader = pdfEnhancer(createReader)

const run = async () => {
  // This is a simplified way for example purpose.
  // You may retrieve your document in different ways
  const pdfBlob = await (await fetch(`/myPdf.pdf`)).blob()
  // Once you have an archive, you can use it to
  // generate manifest and or provide it to the enhancer.
  // It is not required per se but will blend better with prose flow
  const archive = await createArchiveFromPdf(pdfBlob, `myPdf.pdf`)

  const reader = createAppReader({
    // The generated manifest will have uri that matches the
    // archive files. If you let it by default, the
    // enhancer will be able to automatically retrieve the pages
    manifest: await generateManifestFromArchive(archive),
    pdf: {
      pdfjsViewerInlineCss,
      getArchiveForItem: () => of(archive),
    },
  })

  const containerElement = document.getElementById(`reader`)

  if (containerElement) reader.mount(containerElement)

  reader.$.destroy$.subscribe(() => {
    archive.close()
  })
}

run()
```

## With a streamer

`Streamer.accessArchive` holds an archive open until you unsubscribe, which is what `getArchiveForItem` asks for. Once the reader is destroyed, the streamer closes the archive `cleanArchiveAfter` milliseconds later, or at once if you called `prune()` or asked the streamer for another key in the meantime. A reader you create again for the same book before then uses the open archive.

```typescript
const reader = createAppReader({
  manifest,
  pdf: {
    pdfjsViewerInlineCss,
    getArchiveForItem: () => streamer.accessArchive(bookKey),
  },
})
```

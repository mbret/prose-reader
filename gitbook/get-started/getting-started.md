# Getting started

## Installation

```shell
npm install @prose-reader/core @prose-reader/streamer rxjs
```

You don't absolutely need to have `@prose-reader/core-streamer` installed to run the reader but the utilities provided are very useful to standardize and feed books to the engine.  `rxjs` is a peer-dependency of prose-reader and needs to be installed alongside.

## Create your reader & load your book

On your html file you need to define a container for the reader. We will be using a full screen reader but you can have any dimensions.

`index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <style>
      body,
      html,
      #app {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

The next step is to create a streamer and load our book into the reader. There is a lot of comment on purpose to help you understand the basic flow but in the end the code is rather simple.

{% hint style="info" %}
There is a lot of comments in the code to explain the basic but the bootstrap and use of the SDK is fairly simple.
{% endhint %}

We are gonna use an epub as example so you should also install `jszip`

```bash
npm install jszip
```

`index.ts`

```typescript
import { createReader } from "@prose-reader/core"
import { createArchiveFromJszip, Streamer } from "@prose-reader/streamer"
import { from } from "rxjs"
import { loadAsync } from "jszip"

async function createStreamer() {
  /**
   * We create a streamer to load and serve our archive.
   *
   * A streamer is a convenient way to fetch manifest and resources from an archive.
   * This will be used to feed information to the reader.
   *
   * For simplicity we use a web reader but we have a ServiceWorkerStreamer class
   * that can and should be used whenever possible. This will offload the work from
   * the main thread.
   */
  const streamer = new Streamer({
    getArchive: async () => {
      /**
       * First you need to fetch your book. 
       * It can be from anywhere, local, remote, etc.
       */
      const epubResponse = await fetch("http://localhost:3000/accessible_epub_3.epub")

      const epubBlob = await epubResponse.blob()

      /**
       * Because epubs are zip archives, we are gonna use jszip to manage them.
       * You could use a different library but we provide helpers to deal with
       * jszip formats as a convenience.
       */
      const epubJszip = await loadAsync(epubBlob)

      /**
       * We are gonna use prose streamer to manage the epub.
       * The streamer work with archives, so we need to create one from the epub.
       *
       * An archive is a higher level interface that is agnostic to the underlying
       * format so the streamer can manage different formats transparently.
       *
       * We do provide several helpers to create archives from different formats.
       * Epubs being zip archives, we have a helper that create an archive from a
       * jszip object.
       */
      const archive = await createArchiveFromJszip(epubJszip)

      return archive
    },
    /**
     * You can configure the streamer to let it know how long it should
     * keep an archive in memory for example. When the archive is no longer available
     * the getArchive callback will be called again.
     */
    cleanArchiveAfter: 5 * 60 * 1000,
  })

  return streamer
}

async function run() {
  const streamer = await createStreamer()

  const manifestResponse = await streamer.fetchManifest({
    /**
     * The streamer is designed to manage several archives that's why
     * it requires a key to be passed to identify which archive to use.
     *
     * In this case we only have one archive so we can use `_` as key.
     */
    key: `_`,
  })

  const manifest = await manifestResponse.json()

  const reader = createReader({
    /**
     * A manifest provide a list of resources and their URIs.
     *
     * However we are loading the epub locally in memory here so the items cannot be
     * fetched directly. This would be possible and encouraged if using a service worker
     * but in our situation we have to hook into the reader to tell him to get its resources
     * from our local streamer directly.
     *
     * This may seems boilerplaty but the separation between the reader and the streamer is what
     * makes prose very flexible and powerful.
     *
     * You can pretty much load anything in any way you want.
     *
     * We tried to create streamers that simplify the friction as much as possible.
     */
    getResource: (item) => {
      return from(streamer.fetchResource({ key: `_`, resourcePath: item.href }))
    },
  })

  /**
   * Finally we can load the reader with our manifest.
   */
  reader.load({
    containerElement: document.getElementById(`app`)!,
    manifest,
  })
}

run()
```



You should now see the book being displayed.

Explore the next sections to see how to add functionalities such as navigating, gestures, etc.

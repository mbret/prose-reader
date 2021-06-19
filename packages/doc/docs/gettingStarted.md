---
sidebar_position: 2
---

# Getting Started

## Getting Started

```shell
npm install @oboku/reader @oboku/reader-streamer rxjs
```

You don't absolutely need to have `@oboku/reader-streamer` installed to run the reader but the utilities provided are very useful to start quickly.
 `rxjs` it a peer-dependency of oboku-reader and needs to be installed alongside.

## Create your reader

On your html file you need to define a container for the reader. We will be using a full screen reader but you can have any dimensions.

`index.html`
```html
<!doctype html>
  <html>
  <head>
    <style>
      body, html, #reader {
        height: 100%;
        width: 100%;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div id="reader"></div>
    <script src="/index.js"></script>
  </body>
</html>
```

`index.js`
```javascript
import { createReader } from '@oboku/reader'

const reader = createReader({ containerElement: document.getElementById('reader') })
```

## Spin up your book

Once you have a reader instance you can load any book by providing the related manifest. For the sake of the simplicity we are
going to render simple text content. We will see later how to stream `.epub` and other formats.

`index.js`
```javascript
import { createReader } from "@oboku/reader";
import {
  createArchiveFromText,
  getManifestFromArchive,
  getResourceFromArchive
} from "@oboku/reader-streamer";

const reader = createReader({
  containerElement: document.getElementById("reader")
});

(async () => {
  /**
   * First we need to convert the book into an archive. This is the format
   * used by the streamer sdk to generate manifest and resources. This is a sort
   * of common format that allow all the functions to works together seamlessly
   */
  const archive = await createArchiveFromText(`
    Lorem Ipsum is simply dummy text of the printing and typesetting 
    industry. Lorem Ipsum has been the industry's standard dummy text 
    ever since the 1500s, when an unknown printer took a galley of type 
    and scrambled it to make a type specimen book. It has survived not 
    only five centuries, but also the leap into electronic typesetting, 
    remaining essentially unchanged. It was popularised in the 1960s 
    with the release of Letraset sheets containing Lorem Ipsum passages, 
    and more recently with desktop publishing software like Aldus 
    PageMaker including versions of Lorem Ipsum.
  `);

  /**
   * getManifestFromArchive returns a Response object because it is highly suggested
   * to be used over HTTP, in a service worker for example.
   */
  const response = await getManifestFromArchive(archive);

  const manifest = await response.json();

  /**
   * Load the book by providing its manifest.
   * We are bypassing the default behavior of the reader for fetching resources.
   * Because we do not have a streamer, we just serve directly from the archive from
   * our script.
   *
   * It works for our example or light documents but is not really recommended.
   */
  reader.load(manifest, {
    fetchResource: (item) => getResourceFromArchive(archive, item.path)
  });
})();
```

You should now see the book being displayed.

You also already have a quick peak of how to use the streamer sdk to quickly generate manifest and resources. The archive is only relevant when
you use the streamer sdk and the manifest is nothing more than a JSON object that contains the information of the book. As explained earlier
this part has to be done on your side as in our example.

This part is also better done separately. By default the reader will fetch all resources by HTTP so it's a good practice to offload the work in a service worker or a backend. You can also
move the generation of manifest in a service worker, web worker, etc. As a general rule, try to avoid working with big files in the main thread
as much as possible.

** At this point you might be wondering where are the pages number or controls to interact with the book, the next section will cover that. **
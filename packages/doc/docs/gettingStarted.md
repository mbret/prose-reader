---
sidebar_position: 2
---

# Getting Started

## Getting Started

```shell
npm install @oboku/reader @oboku/reader-streamer rxjs
```

You don't absolutely need to have `@oboku/reader-streamer` installed to run the reader but the utilities provided are very useful to start quickly.
We also have to install `rxjs` because it is a peer-dependency of oboku-reader.

## Create your reader

On your html file you need to define a container for the reader. We will use a full screen reader but you can have any dimensions.

`index.html`
```html
<!doctype html>
  <html>
  <head>
    <style>
      body, html, #reader {
        height: 100%;
        width: 100%;
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
gonna render simple text content. We will see later how to stream `.epub` and other formats.

`index.js`
```javascript
import { createReader } from '@oboku/reader'

const reader = createReader({ containerElement: document.getElementById('reader') })

(async () => {
  const book = await fetch(
    "https://github.com/IDPF/epub3-samples/releases/download/20170606/accessible_epub_3.epub",
    { mode: "no-cors" }
  );
  const bookData = await book.blob()
})();
```

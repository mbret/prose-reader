<p align="center">
  <a 
  href="https://github.com/mbret/oboku">
    <img src="https://user-images.githubusercontent.com/1911240/99893449-bca35e00-2cc3-11eb-88c1-80b3190eb620.png" alt="Logo" width="75" height="75">
  </a>

  <h3 align="center">@oboku/reader</h3>

  <p align="center">
    Official reader used by <a href="https://oboku.me">oboku</a>
    <br>
    <a href="https://github.com/mbret/oboku-reader/issues/new">Report bug</a>
    ·
    <a href="https://github.com/mbret/oboku-reader/issues/new">Request feature</a>
  </p>
</p>

Demo is available at [oboku-reader.vercel.app](https://oboku-reader.vercel.app)

@oboku/reader is an open source javascript library for rendering ePub and other digital documents in the browser (TWA, webview, ...) across many devices.

## How does it works?

![image](https://user-images.githubusercontent.com/1911240/121635379-1aad5c80-cac1-11eb-9ceb-ea39b1adb281.png)

The project is composed of two main parts, the **reader** and the **streamer**. 

### reader (@oboku/reader)
The engine that renders the book on your web page. It consume a [manifest](https://github.com/mbret/oboku-reader/blob/master/packages/reader/src/types/Manifest.ts) which represent an electronic publication structure (reading direction, list of items, their path in the book, etc). By default the reader will use the URL provided for each item to fetch and display each page, which brings us to the streamer.

### streamer
It's the entity which distribute the manifest and the various resources to the reader when being asked. There are no plug-&-play steamer provided in this repository as it can be different for everyone, based on their requirements. Maybe you want to serve your content from a server with nodejs, maybe you want to do it in a service worker or web worker, etc.

Instead `@oboku/reader-streamer` is a set of utility functions that you can use to create your own streamer instance. It offers you convenient method to do things such as
- generate manifest from `.epub`, `.txt`, `.cbz`, etc
- convert raw text, img, etc into a valid `.xhtml` resource that can be consumed by the reader

Building your own streamer is not complicated and you can check the `web-reader` package to see how to do it with service worker.

The streamer is not mandatory, all the reader needs is a manifest and a way to retrieve the resources. By default it will use the URL from each item and try to fetch it (hence streaming). However it is possible to override this behavior and use a custom callback function to return the data the way you want. The idea of using a streamer is to provide a better separation of concern, a better way to cache and process resources off thread.

## Getting started (consumer)

```
npm install @oboku/reader
npm install @oboku/reader-streamer
```

Visit the web reader package to have an example of use case with React library.
See [web-reader](https://github.com/mbret/oboku-reader/tree/master/packages/web-reader)

## Getting started (developer)
```
yarn
yarn start
```

You should be able to open [http://localhost:9000/?epub=accessible_epub_3.epub](http://localhost:9000/?epub=accessible_epub_3.epub) and see the development web reader.


## Creators

**Maxime Bret**

- <https://github.com/mbret>

## Copyright and license

Code released under the [MIT License](https://mbret/@oboku/reader/blob/master/LICENSE).

Enjoy :metal:

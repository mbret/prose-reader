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

@oboku/reader is an open source library for rendering ePub and other digital documents in the browser, across many devices.

## How does it works?

The project is composed of two main parts, the **reader** and the **streamer**. The reader purpose is to consume a document (a [manifest](https://github.com/mbret/oboku-reader/blob/master/packages/reader/src/types/Manifest.ts)) which represent a digital document. The streamer is a tool that will help you convert any document into a consumable manifest for the reader.

As you probably figured, the streamer and the reader are meant to work side by side. Although the reader requires a specific format to consume, it is not required to use the streamer if you want to implement your own custom streamer. So long as the manifest follow the [specs](https://github.com/mbret/oboku-reader/blob/master/packages/reader/src/types/Manifest.ts).

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

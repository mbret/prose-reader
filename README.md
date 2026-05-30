<p align="center">
  <a href="https://prose-reader.com/">
    <img src="https://user-images.githubusercontent.com/1911240/99893449-bca35e00-2cc3-11eb-88c1-80b3190eb620.png" alt="prose logo" width="75" height="75">
  </a>
</p>

<h1 align="center">prose</h1>

<p align="center">
  <b>The open-source engine for building reading apps in the browser.</b>
  <br/>
  Render EPUB3, comics, and PDF with a single, framework-agnostic SDK — and ship your own reader, your way.
</p>

<p align="center">
  <img src="https://img.shields.io/npm/l/@prose-reader/core?color=brightgreen" alt="license">
  <img src="https://img.shields.io/badge/EPUB-3.3-orange" alt="EPUB 3.3">
  <img src="https://img.shields.io/badge/types-TypeScript-blue" alt="TypeScript">
</p>

<p align="center">
  <a href="https://demo.prose-reader.com/"><b>🚀 Live demo</b></a>
  ·
  <a href="https://doc.prose-reader.com/"><b>📖 Documentation</b></a>
  ·
  <a href="https://prose-reader.com/">Website</a>
  ·
  <a href="https://github.com/mbret/prose-reader/issues/new">Report a bug</a>
  ·
  <a href="https://github.com/mbret/prose-reader/issues/new">Request a feature</a>
</p>

---

## What is prose?

**prose** is a free, open-source **Reading System Engine** — the hard part of an ebook reader, packaged as a modern SDK. It takes care of parsing, layout, pagination, navigation, and rendering so you can focus on building your own reading experience.

It strictly follows the [EPUB 3.3 specification](https://www.w3.org/TR/epub-33/) and, in theory, can render **anything**: its *enhancer* system lets you teach the engine new media types and behaviors. Comics (CBZ/CBR), PDF, and plain text already ship as enhancers — and you can write your own for any format you need.

## Who is it for?

Developers and teams building **reading apps, ebook stores, document viewers, or comic readers** for the web (and, via a WebView bridge, React Native). If you'd otherwise glue together a parser, a paginator, and a renderer by hand, prose gives you that foundation out of the box.

## Try it now

**No install required** — open the [live demo](https://demo.prose-reader.com/) and load your own EPUB, CBZ, or PDF.

Ready to build? Follow the **[Getting started guide](https://doc.prose-reader.com/get-started/getting-started)** to create your first reader in a few minutes.

## Contributing

This is a [Lerna](https://lerna.js.org/) monorepo.

```bash
npm install
npm run build:lib   # build all packages
npm run start:demo  # run the demo app locally
npm test            # run the test suites
```

Issues and pull requests are welcome — see [the issues page](https://github.com/mbret/prose-reader/issues) to get started.

## License

MIT © Maxime Bret

<p align="center">
  Built with prose: <a href="https://oboku.me/">oboku</a>, a modern and free reading app. Come take a look!
</p>

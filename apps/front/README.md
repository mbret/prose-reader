# prose-reader-front

The prose website. It serves both:

- `/` — the landing page.
- `/demo` — the official demo, a reader made with React that showcases the
  capabilities of the engine and its enhancers. It doubles as an integration
  example, see [the demo docs](../../gitbook/get-started/demo-and-showcase.md).

The demo bundle is loaded lazily so that visiting the landing page does not
download the reading engine.

## Development

The packages must be built (or watched) first, from the repository root:

```bash
npm install
npm run build:lib   # or `npm run start:lib` to watch them
npm run start:front
```

The app is then served on http://localhost:9000, the demo on
http://localhost:9000/demo.

## Service worker

The demo streams its books through a service worker (`src/demo/serviceWorker`),
registered at the root scope so that its `/streamer` routes stay reachable from
the `/demo` pages. It is only registered once the user enters the demo.

Firefox does not support module service workers in development. To work on it
with Firefox, build the app and copy the generated `service-worker.js` into
`public/`.

## Work on your own book

Visit http://localhost:9000/demo/books and upload your own book, which you can
then open.

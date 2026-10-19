# prose-reader-front

The prose website, made of two pages:

- `/`, from `index.html`: the landing page. The build renders it to HTML with
  `src/landing/prerender.tsx`, and `scripts/prerender-landing.mjs` writes that
  HTML into the built `index.html`. React then hydrates it in the browser.
- `/demo`, from `demo.html`: the official demo, a reader made with React that
  showcases the capabilities of the engine and its enhancers. It doubles as an
  integration example, see [the demo docs](../docs/src/content/docs/get-started/demo-and-showcase.md).
  Every path under `/demo` serves this page: `vercel.json` routes it in
  production, and a middleware in `vite.config.ts` in development and preview.

The landing page loads none of the demo's code, so visiting it does not
download the reading engine.

## Development

The packages must be built (or watched) first, from the repository root:

```bash
pnpm install
pnpm run build:lib   # or `pnpm run start:lib` to watch them
pnpm run start:front
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

## Viewport

The app ships a single, zoomable viewport. The demo deliberately does not lock
browser zoom the way it did as a standalone app: the engine owns touch over the
book content itself, and the host-side gap that motivated the lock is tracked in
https://github.com/mbret/prose-reader/issues/357.

## Work on your own book

Visit http://localhost:9000/demo/books and upload your own book, which you can
then open.

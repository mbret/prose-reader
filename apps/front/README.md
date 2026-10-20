# prose-reader-front

The prose website, made of two pages:

- `/`, from `index.html`: the landing page.
- `/demo`, from `demo.html`: the official demo, a reader made with React that
  showcases the capabilities of the engine and its enhancers. It doubles as an
  integration example, see [the demo docs](../docs/src/content/docs/get-started/demo-and-showcase.md).
  Every path under `/demo` serves this page: `vercel.json` routes it in
  production, and a middleware in `vite.config.ts` in development and preview.

The landing page loads none of the demo's code, so visiting it does not
download the reading engine. Each page keeps its code in its own folder,
`src/landing` and `src/demo`.

The demo's Chakra UI snippets live in `src/demo/components/ui`. The Chakra CLI
writes to `src/components/ui` unless told otherwise, so add one with:

```bash
npx @chakra-ui/cli snippet add <name> --outdir src/demo/components/ui
```

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

## Search engines and link previews

The pages render in the browser, so each page's `<head>` carries what crawlers
and link previews read:

- `index.html`: the title, description, canonical URL, Open Graph and Twitter
  card tags, and structured data naming the site and the project.
- `demo.html`: the title, description and link preview of the demo. The reader
  screen adds `noindex`, so the books the demo opens stay out of search results.

`public/social-card.jpg` is the link preview image, rendered from
`assets/brand/social-card.html`. `public/sitemap.xml` lists the pages to index,
and `public/robots.txt` points to it.

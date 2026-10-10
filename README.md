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
  <a href="https://prose-reader.com/demo"><b>🚀 Live demo</b></a>
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

**No install required** — open the [live demo](https://prose-reader.com/demo) and load your own EPUB, CBZ, or PDF.

Ready to build? Follow the **[Getting started guide](https://doc.prose-reader.com/get-started/getting-started)** to create your first reader in a few minutes.

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) explains how to report a bug, what a pull request needs, and how it gets released. Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

### Repository layout

prose is a pnpm workspace, with [Lerna](https://lerna.js.org/) on top to run tasks and cut releases.

- `packages/`: the libraries, published to npm as `@prose-reader/*`.
- `apps/front`: the website, with the demo under `/demo`.
- `apps/tests`: the browser test suite, on Playwright.
- `apps/metadata-fetcher-api`: the metadata fetcher as an HTTP service, also published as a Docker image.
- `gitbook/`: the documentation, published at [doc.prose-reader.com](https://doc.prose-reader.com/).
- `prose-react-native-demo/`: an Expo app. It is not a workspace member: it installs with npm, from its own lockfile, the way an app consuming the libraries would.

### Setup

Use the Node version in `.nvmrc` and the pnpm version in the `packageManager` field of `package.json`. CI reads the same two pins.

```bash
nvm install
nvm use
npm install --global "$(node -p "require('./package.json').packageManager")"
pnpm install
pnpm run build:lib
```

Build the libraries before you run a test or an app. Workspace packages resolve each other to their build output, so a fresh checkout fails on unresolved `@prose-reader/*` imports until the libraries are built. After you change a library, rebuild it, or keep `pnpm run start:lib` running to rebuild every library on change.

`pnpm install` also sets up a pre-commit hook. It runs `biome check --write` on the staged files: it formats them, applies safe lint fixes, and stops the commit on a lint error it cannot fix.

### Build and run

| Task                                              | Command                |
| ------------------------------------------------- | ---------------------- |
| Build the libraries                               | `pnpm run build:lib`   |
| Build every project, the website included         | `pnpm run build`       |
| Rebuild the libraries on every change             | `pnpm run start:lib`   |
| Run the website and the demo, on port 9000        | `pnpm run start:front` |
| Run the library watchers and the website together | `pnpm start`           |

### Checks

CI runs these on every pull request, and also builds the metadata fetcher API's Docker image and checks that it starts.

| Check                                                          | Command                                                                       |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Formatting                                                     | `pnpm run format`                                                             |
| Lint                                                           | `pnpm run lint`                                                               |
| Every `AGENTS.md` has its `CLAUDE.md`, every skill its symlink | `pnpm run check:agent-docs`                                                   |
| Internal `@prose-reader/*` dependency ranges                   | `pnpm run check:internal-ranges`                                              |
| `@prose-reader/react-native` against its Expo SDK              | `pnpm run check:expo-sdk`                                                     |
| Types, after `pnpm run build`                                  | `pnpm run tsc`                                                                |
| Unit tests                                                     | `pnpm exec lerna run test --ignore prose-reader-tests`                        |
| Browser tests, set up as described below                       | `pnpm --filter prose-reader-tests test`                                       |
| React Native demo, after `pnpm run build:lib`                  | `cd prose-react-native-demo && npm ci && npm run typecheck && npm run bundle` |

- `pnpm --filter @prose-reader/core test` runs one package's unit tests.
- `pnpm test` runs the unit and browser tests together.
- `pnpm exec biome check --write .` fixes formatting and applies safe lint fixes.

### Browser tests

The unit tests run in happy-dom or jsdom, which have no layout engine. Behaviour that depends on layout is tested in `apps/tests`, in real browsers: pagination, a CFI resolving to visible content, restoring a position after a resize, scrolling. [apps/tests/AGENTS.md](apps/tests/AGENTS.md) explains how the suite is built.

Install the browser builds that Playwright pins, once:

```bash
pnpm --filter prose-reader-tests exec playwright install --with-deps
```

Chromium alone is enough while you work on one spec:

```bash
pnpm --filter prose-reader-tests exec playwright install chromium
pnpm --filter prose-reader-tests test --project=chromium tests/<path>.spec.ts
```

- The suite imports `@prose-reader/*` from `dist/`. Rebuild the library you changed before you run a spec again.
- Run it on the browsers Playwright installs, not on one your machine already has. A pass on another build is not a pass in CI.
- CI runs the suite on Chromium, Firefox, WebKit and two mobile profiles, on macOS, where the screenshot baselines are rendered. On another OS, the specs that compare screenshots fail locally.

## License

[MIT](LICENSE) © Maxime Bret

<p align="center">
  Built with prose: <a href="https://oboku.me/">oboku</a>, a modern and free reading app. Come take a look!
</p>

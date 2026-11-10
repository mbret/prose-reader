import { defineConfig } from "vitest/config"

export default defineConfig(() => ({
  test: {
    environment: "happy-dom",
    // The reader injects its stylesheet at mount, and vitest replaces every
    // stylesheet with an empty one unless asked to compile it.
    css: { include: [/\.scss/] },
    environmentOptions: {
      // The renderer loads each document in an iframe and waits on its
      // stylesheets, and happy-dom fetches neither unless asked to.
      //
      // happy-dom stays on 21.0.3. From 21.0.4, a frame whose URL has a
      // `null` origin is cross-origin, and in Node every `blob:` URL, which
      // the renderer loads each document from, has one.
      happyDOM: {
        settings: {
          enableCSSFileLoading: true,
          enableIframePageLoading: true,
        },
      },
    },
    coverage: {
      reportsDirectory: `./.test/coverage`,
    },
  },
}))

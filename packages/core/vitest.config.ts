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

import { defineConfig } from "vitest/config"

export default defineConfig(() => ({
  test: {
    environment: "happy-dom",
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

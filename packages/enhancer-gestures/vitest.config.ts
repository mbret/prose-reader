import { defineConfig } from "vitest/config"

export default defineConfig(() => ({
  test: {
    // The enhancer injects its stylesheet, which sets the reader's
    // touch-action, and vitest replaces every stylesheet with an empty one
    // unless asked to compile it.
    css: { include: [/\.css/] },
    coverage: {
      reportsDirectory: `./.test/coverage`,
    },
  },
}))

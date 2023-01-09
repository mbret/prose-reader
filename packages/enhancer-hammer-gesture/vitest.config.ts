import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
  test: {
    coverage: {
      reportsDirectory: `./.test/coverage`,
    },
  },
}))

/// <reference types="vitest/config" />
import { defineConfig, mergeConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib.mts"

const libConfig = createLibConfig({
  packageDir: import.meta.dirname,
})

export default defineConfig((env) =>
  mergeConfig(libConfig(env), {
    test: {
      environment: "jsdom",
      coverage: {
        reportsDirectory: `./.test/coverage`,
      },
    },
  }),
)

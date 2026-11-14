import { defineConfig, mergeConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib.mts"

const libConfig = createLibConfig({
  packageDir: import.meta.dirname,
  preserveModules: true,
})

export default defineConfig((env) =>
  mergeConfig(libConfig(env), {
    test: {
      coverage: {
        reportsDirectory: `./.test/coverage`,
      },
    },
  }),
)

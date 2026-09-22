import { defineConfig, mergeConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib"

const libConfig = createLibConfig({
  packageDir: __dirname,
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

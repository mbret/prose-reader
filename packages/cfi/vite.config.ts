/// <reference types="vitest/config" />
import { defineConfig, mergeConfig } from "vite"
import dts from "vite-plugin-dts"
import { createLibConfig } from "../../config/vite-lib"

const libConfig = createLibConfig({
  packageDir: __dirname,
})

export default defineConfig((env) =>
  mergeConfig(libConfig(env), {
    plugins: [
      dts({
        entryRoot: "src",
        include: ["src/**/*"],
      }),
    ],
    test: {
      environment: "jsdom",
      coverage: {
        reportsDirectory: `./.test/coverage`,
      },
    },
  }),
)

// vite.config.js
import { resolve } from "node:path"
import { defineConfig } from "vite"
import { dtsPlugin } from "../../config/vite-lib.mts"

export default defineConfig(({ mode }) => {
  return {
    build: {
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: resolve(import.meta.dirname, `src/index.ts`),
        fileName: `index`,
        // ES modules only, no UMD (see config/vite-lib.mts for the rationale).
        formats: [`es`],
      },
      emptyOutDir: mode !== "development",
      sourcemap: true,
      rollupOptions: {
        // make sure to externalize deps that shouldn't be bundled
        // into your library
        external: [`rxjs`],
      },
    },
    plugins: [dtsPlugin()],
  }
})

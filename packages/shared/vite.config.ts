// vite.config.js
import { resolve } from "node:path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig(({ mode }) => {
  return {
    build: {
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: resolve(__dirname, `src/index.ts`),
        fileName: `index`,
        // ESM + CJS only, no UMD (see config/vite-lib.ts for the rationale).
        formats: [`es`, `cjs`],
      },
      emptyOutDir: mode !== "development",
      sourcemap: true,
      rollupOptions: {
        // make sure to externalize deps that shouldn't be bundled
        // into your library
        external: [`rxjs`],
      },
    },
    plugins: [
      dts({
        entryRoot: "src",
      }),
    ],
  }
})

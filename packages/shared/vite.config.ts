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
        name: `prose-shared`,
        fileName: `index`,
      },
      emptyOutDir: mode !== "development",
      sourcemap: true,
      rollupOptions: {
        // make sure to externalize deps that shouldn't be bundled
        // into your library
        external: [`rxjs`],
        output: {
          // Provide global variables to use in the UMD build
          // for externalized deps
          globals: {
            // vue: `Vue`,
          },
        },
      },
    },
    plugins: [
      dts({
        entryRoot: "src",
      }),
    ],
  }
})

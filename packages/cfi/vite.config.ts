// vite.config.js
import { resolve } from "node:path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import { name } from "./package.json"

const libName = name.replace(`@`, ``).replace(`/`, `-`)

export default defineConfig(({ mode }) => {
  return {
    build: {
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: resolve(__dirname, `src/index.ts`),
        name: libName,
        fileName: `index`,
      },
      emptyOutDir: mode !== "development",
      sourcemap: true,
    },
    plugins: [
      dts({
        entryRoot: "src",
      }),
    ],
  }
})

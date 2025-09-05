// vite.config.js
import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(__dirname, `src/index.ts`),
      name: `prose-streamer`,
      fileName: `index`,
    },
    sourcemap: true,
    minify: mode === "development" ? false : "esbuild",
    emptyOutDir: mode !== "development",
  },
  plugins: [
    externals({
      peerDeps: true,
      deps: true,
      devDeps: true,
    }),
    dts({
      entryRoot: "src",
    }),
  ],
}))

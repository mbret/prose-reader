import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig(({ mode }) => ({
  build: {
    minify: false,
    lib: {
      entry: resolve(__dirname, `src/index.ts`),
      fileName: "index",
      // ESM + CJS only, no UMD (see config/vite-lib.ts for the rationale).
      formats: [`es`, `cjs`],
    },
    emptyOutDir: mode !== `development`,
    sourcemap: true,
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

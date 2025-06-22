// vite.config.js
import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(__dirname, `src/index.ts`),
      name: `prose`,
      fileName: `index`,
    },
    minify: mode !== `development`,
    sourcemap: true,
    emptyOutDir: mode !== `development`,
  },
  plugins: [
    {
      enforce: `pre`,
      ...externals({
        peerDeps: true,
        deps: true,
        devDeps: true,
      }),
    },
    dts({
      staticImport: true,
    }),
  ],
}))

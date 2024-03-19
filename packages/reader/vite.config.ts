// vite.config.js
import { resolve } from "path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import externals from "rollup-plugin-node-externals"

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(__dirname, `src/index.ts`),
      name: `prose`,
      fileName: `index`,
    },
    minify: false,
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
    dts(),
  ],
}))

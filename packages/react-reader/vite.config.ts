import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"
import dts from "vite-plugin-dts"
import externals from "rollup-plugin-node-externals"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "prose-react-reader",
      fileName: `index`,
    },
    emptyOutDir: mode !== "development",
    sourcemap: true,
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
    react(),
    dts({
      tsconfigPath: "./tsconfig.app.json",
      entryRoot: "src",
    }),
  ],
}))

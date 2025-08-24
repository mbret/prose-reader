import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import externals from "rollup-plugin-node-externals"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

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
    externals({
      peerDeps: true,
      deps: true,
      devDeps: true,
    }),
    react(),
    dts({
      tsconfigPath: "./tsconfig.app.json",
      entryRoot: "src",
    }),
  ],
}))

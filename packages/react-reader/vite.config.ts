import { resolve } from "node:path"
import babel from "@rolldown/plugin-babel"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import externals from "rollup-plugin-node-externals"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      fileName: `index`,
      // ES modules only, no UMD (see config/vite-lib.mts for the rationale).
      formats: ["es"],
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
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],
}))

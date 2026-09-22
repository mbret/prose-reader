import { resolve } from "node:path"
import babel from "@rolldown/plugin-babel"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import externals from "rollup-plugin-node-externals"
import { defineConfig } from "vite"
import { dtsPlugin } from "../../config/vite-lib"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: `index`,
      // ESM + CJS only, no UMD (see config/vite-lib.ts for the rationale).
      formats: ["es", "cjs"],
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
    dtsPlugin({ tsconfigPath: "./tsconfig.app.json" }),
  ],
}))

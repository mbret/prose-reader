import { resolve } from "node:path"
import babel from "@rolldown/plugin-babel"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import externals from "rollup-plugin-node-externals"
import { defineConfig, type Plugin } from "vite"
import { dtsPlugin } from "../../config/vite-lib"

/**
 * The enhancers are optional peers, so the reader has to load with none of
 * them installed: only their types may reach the bundle. `@prose-reader/cbz`
 * is one without the `enhancer-` prefix.
 */
const OPTIONAL_ENHANCER_PACKAGE = /^@prose-reader\/(enhancer-|cbz(\/|$))/

const rejectRuntimeEnhancerImports = (): Plugin => ({
  name: "reject-runtime-enhancer-imports",
  generateBundle(_, bundle) {
    for (const output of Object.values(bundle)) {
      if (output.type !== "chunk") continue

      const enhancerImports = [
        ...output.imports,
        ...output.dynamicImports,
      ].filter((importedId) => OPTIONAL_ENHANCER_PACKAGE.test(importedId))

      if (enhancerImports.length > 0) {
        this.error(
          `${output.fileName} imports ${enhancerImports.join(", ")} at runtime. Use \`import type\` for enhancer packages, or access runtime behavior through the reader instance.`,
        )
      }
    }
  },
})

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
    rejectRuntimeEnhancerImports(),
  ],
}))

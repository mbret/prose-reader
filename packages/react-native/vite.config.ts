import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import { defineConfig, type UserConfig } from "vite"

export default defineConfig(({ mode }): UserConfig => {
  return {
    build: {
      lib: {
        entry: {
          web: resolve(import.meta.dirname, "src/web/index.ts"),
          native: resolve(import.meta.dirname, "src/native/index.ts"),
          shared: resolve(import.meta.dirname, "src/shared/index.ts"),
        },
        formats: ["es"],
        fileName: (_format, entryName) => `${entryName}/index.js`,
      },
      emptyOutDir: mode !== "development",
    },
    plugins: [
      externals({
        peerDeps: true,
        deps: true,
        devDeps: true,
      }),
    ],
  }
})

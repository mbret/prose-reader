import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import { defineConfig, type UserConfig } from "vite"
import { dtsPlugin } from "../../config/vite-lib"

export default defineConfig((): UserConfig => {
  return {
    build: {
      lib: {
        entry: {
          web: resolve(__dirname, "src/web/index.ts"),
          native: resolve(__dirname, "src/native/index.ts"),
          shared: resolve(__dirname, "src/shared/index.ts"),
        },
        fileName: (format, entryName) =>
          `${entryName}/index.${format === "cjs" ? "cjs" : "js"}`,
      },
    },
    plugins: [
      externals({
        peerDeps: true,
        deps: true,
        devDeps: true,
      }),
      dtsPlugin({ tsconfigPath: "./tsconfig.build.json" }),
    ],
  }
})

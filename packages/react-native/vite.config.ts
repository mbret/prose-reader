import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig(() => {
  return {
    esbuild: {
      // make sure React global is available at RN side.
      jsx: "automatic",
    },
    build: {
      lib: {
        entry: {
          web: resolve(__dirname, "src/web/index.ts"),
          native: resolve(__dirname, "src/native/index.ts"),
          shared: resolve(__dirname, "src/shared/index.ts"),
        },
        fileName: (format, entryName) => `${entryName}/index.${format}.js`,
      },
    },
    plugins: [
      externals({
        peerDeps: true,
        deps: true,
        devDeps: true,
      }),
      dts({
        entryRoot: "src",
        tsconfigPath: "./tsconfig.build.json",
      }),
    ],
  }
})

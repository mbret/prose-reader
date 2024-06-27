// vite.config.js
import { resolve } from "path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(__dirname, `src/index.ts`),
      name: `prose-streamer`,
      fileName: `index`,
    },
    sourcemap: true,
    minify: mode === "development" ? false : "esbuild",
    emptyOutDir: mode !== "development",
    rollupOptions: {
      external: ["xmldoc", "@prose-reader/shared"],
      output: {
        globals: {
          xmldoc: "xmldoc",
          "@prose-reader/shared": `@prose-reader/shared`,
        },
      },
    },
  },
  plugins: [
    dts({
      entryRoot: "src",
    }),
  ],
}))

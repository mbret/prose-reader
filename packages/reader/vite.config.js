// vite.config.js
import { resolve } from "path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(__dirname, `src/index.ts`),
      name: `prose`,
      fileName: `prose`,
    },
    sourcemap: true,
    emptyOutDir: mode !== `development`,
    rollupOptions: {
      external: [`rxjs`, `@prose-reader/shared`],
      output: {
        globals: {
          rxjs: `rxjs`,
          "@prose-reader/shared": `@prose-reader/shared`,
        },
      },
    },
  },
  plugins: [dts()],
}))

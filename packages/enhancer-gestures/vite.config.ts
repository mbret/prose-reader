import { defineConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib.mts"

export default defineConfig(
  createLibConfig({
    packageDir: import.meta.dirname,
    minify: false,
  }),
)

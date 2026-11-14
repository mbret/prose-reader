import { defineConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib.mts"

const libConfig = createLibConfig({
  packageDir: import.meta.dirname,
  minify: false,
  target: "esnext",
})

export default defineConfig(libConfig)

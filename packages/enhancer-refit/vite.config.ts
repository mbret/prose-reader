import { defineConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib"

const libConfig = createLibConfig({
  packageDir: __dirname,
  minify: false,
  target: "esnext",
})

export default defineConfig(libConfig)

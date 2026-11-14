import { resolve } from "node:path"
import { defineConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib.mts"

const libConfig = createLibConfig({
  packageDir: import.meta.dirname,
  // Object form on purpose: it nests the output as `dist/index/index.*`
  // (the layout the package.json `exports` map points to) rather than the
  // flat `dist/index.*` a string entry would produce.
  entry: {
    index: resolve(import.meta.dirname, "src/index.ts"),
  },
})

export default defineConfig(libConfig)

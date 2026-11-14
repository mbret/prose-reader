import { defineConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib.mts"

const libConfig = createLibConfig({
  packageDir: import.meta.dirname,
  dts: { staticImport: true },
})

export default defineConfig(libConfig)

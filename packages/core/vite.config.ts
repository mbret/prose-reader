import { defineConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib"

const libConfig = createLibConfig({
  packageDir: __dirname,
  dts: { staticImport: true },
})

export default defineConfig(libConfig)

import { defineConfig, mergeConfig } from "vite"
import dts from "vite-plugin-dts"
import { createLibConfig } from "../../config/vite-lib"
import { name } from "./package.json"

const libConfig = createLibConfig({
  packageDir: __dirname,
  packageName: name,
})

export default defineConfig((env) =>
  mergeConfig(libConfig(env), {
    plugins: [dts({ entryRoot: "src", include: ["src/**/*"] })],
  }),
)

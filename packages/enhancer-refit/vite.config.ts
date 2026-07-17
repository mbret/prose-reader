import { defineConfig, mergeConfig } from "vite"
import dts from "vite-plugin-dts"
import { createLibConfig } from "../../config/vite-lib"

const libConfig = createLibConfig({
  packageDir: __dirname,
  minify: false,
  target: "esnext",
})

export default defineConfig((env) =>
  mergeConfig(libConfig(env), {
    plugins: [dts({ entryRoot: "src", include: ["src/**/*"] })],
  }),
)

import { resolve } from "node:path"
import { defineConfig, mergeConfig } from "vite"
import dts from "vite-plugin-dts"
import { createLibConfig } from "../../config/vite-lib"
import { name } from "./package.json"

const libConfig = createLibConfig({
  packageDir: __dirname,
  packageName: name,
  // Object form on purpose: it keeps the multi-entry `dist/index/index.*`
  // output layout the package.json `exports` map points to.
  entry: {
    index: resolve(__dirname, "src/index.ts"),
  },
})

export default defineConfig((env) =>
  mergeConfig(libConfig(env), {
    plugins: [dts({ entryRoot: "src", include: ["src/**/*"] })],
  }),
)

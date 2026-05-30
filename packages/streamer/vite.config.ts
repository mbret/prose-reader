import { resolve } from "node:path"
import { defineConfig, mergeConfig } from "vite"
import dts from "vite-plugin-dts"
import { createLibConfig } from "../../config/vite-lib"
import { name } from "./package.json"

const libConfig = createLibConfig({
  packageDir: __dirname,
  packageName: name,
  entry: {
    index: resolve(__dirname, "src/index.ts"),
    "archives/createArchiveFromJszip": resolve(
      __dirname,
      "src/archives/createArchiveFromJszip.ts",
    ),
    "archives/createArchiveFromLibArchive": resolve(
      __dirname,
      "src/archives/createArchiveFromLibArchive.ts",
    ),
    "archives/createArchiveFromUnzipper": resolve(
      __dirname,
      "src/archives/createArchiveFromUnzipper.ts",
    ),
  },
})

export default defineConfig((env) =>
  mergeConfig(libConfig(env), {
    plugins: [dts({ entryRoot: "src", include: ["src/**/*"] })],
  }),
)

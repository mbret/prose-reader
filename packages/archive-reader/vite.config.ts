import { resolve } from "node:path"
import { defineConfig, mergeConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib.mts"

const libConfig = createLibConfig({
  packageDir: import.meta.dirname,
  entry: {
    index: resolve(import.meta.dirname, "src/index.ts"),
    "archives/createArchiveFromJszip": resolve(
      import.meta.dirname,
      "src/archives/createArchiveFromJszip.ts",
    ),
    "archives/createArchiveFromLibArchive": resolve(
      import.meta.dirname,
      "src/archives/createArchiveFromLibArchive.ts",
    ),
    "archives/createArchiveFromUnzipper": resolve(
      import.meta.dirname,
      "src/archives/createArchiveFromUnzipper.ts",
    ),
    "archives/createArchiveFromNodeUnrarJs": resolve(
      import.meta.dirname,
      "src/archives/createArchiveFromNodeUnrarJs.ts",
    ),
    "archives/createArchiveFromZipJs": resolve(
      import.meta.dirname,
      "src/archives/createArchiveFromZipJs.ts",
    ),
  },
})

export default defineConfig((env) =>
  mergeConfig(libConfig(env), {
    test: {
      coverage: {
        reportsDirectory: `./.test/coverage`,
      },
    },
  }),
)

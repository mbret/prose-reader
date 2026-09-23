import { rename } from "node:fs/promises"
import path from "node:path"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

const page = "index.html"
const stagedPage = `${page}.tmp`

/**
 * Metro serves `dist/index.html` to the app while `npm run start:all` rebuilds
 * it, and Vite writes its output in place, so a download landing mid-write
 * would get a truncated page. Vite writes the page under a staging name
 * instead, and a rename then replaces the published one atomically: a reader
 * gets the previous page or the new one, never part of either.
 */
function publishPageAtomically(): Plugin {
  return {
    name: "publish-page-atomically",
    apply: "build",
    generateBundle: {
      // After vite:singlefile has inlined the scripts and styles into the page.
      order: "post",
      handler(_options, bundle) {
        const output = bundle[page]

        if (output?.type !== "asset") {
          this.error(`${page} is not in the bundle`)
        }

        delete bundle[page]
        this.emitFile({
          type: "asset",
          fileName: stagedPage,
          source: output.source,
        })
      },
    },
    async writeBundle({ dir }) {
      if (!dir) {
        this.error("the output directory is not set")
      }

      await rename(path.join(dir, stagedPage), path.join(dir, page))
    },
  }
}

export default defineConfig({
  build: {
    // Emptying the output before each build would delete the published page
    // while Metro may be serving it.
    emptyOutDir: false,
  },
  plugins: [
    viteSingleFile({
      removeViteModuleLoader: true,
    }),
    publishPageAtomically(),
  ],
})

import { createReadStream } from "node:fs"
import { createRequire } from "node:module"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

const require = createRequire(import.meta.url)

/**
 * The pdf.js worker is a module worker. When Vite's dev server serves it, its
 * import-analysis step injects `import "/@vite/client"` (for `injectQuery` URL
 * rewriting), which boots the Vite HMR client *inside the worker* and opens a
 * WebSocket. Playwright's Firefox agent crashes on a worker-context WebSocket
 * (assert in FFPage._onWebSocketOpened), which breaks every PDF test on Firefox.
 *
 * Serve the worker file raw (no transform, no client injection) so the worker
 * never opens a socket. HMR is irrelevant for the test app anyway.
 */
const serveRawPdfWorker = (): Plugin => ({
  name: "serve-raw-pdf-worker",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const [pathname = "", query = ""] = (req.url ?? "").split("?")

      // Only intercept the worker's own module fetch, not the `?url` import
      // that resolves its path (which must keep its `export default` shape).
      if (
        pathname.endsWith("/pdfjs-dist/build/pdf.worker.min.mjs") &&
        !new URLSearchParams(query).has("url")
      ) {
        res.setHeader("Content-Type", "text/javascript")
        createReadStream(
          require.resolve("pdfjs-dist/build/pdf.worker.min.mjs"),
        ).pipe(res)
        return
      }

      next()
    })
  },
})

export default defineConfig(() => {
  return {
    build: {
      minify: false,
    },
    optimizeDeps: {
      esbuildOptions: {
        // Node.js global to browser globalThis
        // fix sax on browser
        define: {
          global: "globalThis",
        },
      },
    },
    server: {
      port: 3333,
    },
    plugins: [serveRawPdfWorker(), react()],
  }
})

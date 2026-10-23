import { createReadStream } from "node:fs"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { basename, resolve } from "node:path"
import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { ServiceWorkerStreamer } from "@prose-reader/streamer"
import react from "@vitejs/plugin-react"
// CommonJS in Node, where a named import of it fails
import JSZip from "jszip"
import { defineConfig, type Plugin } from "vite"

const require = createRequire(import.meta.url)

const BOOKS_DIRECTORY = resolve(import.meta.dirname, "public/epubs")
const STREAMER_PATH = "/streamer"

/**
 * Streams the fixture books over http, as an app's service worker or server
 * streams a book: `/streamer/<file>/manifest` is the manifest of
 * `public/epubs/<file>`, and its hrefs point at `/streamer/<file>/<path>`, on
 * the page's origin, so the reader loads each document straight from its url.
 *
 * Each book has a streamer of its own: a streamer keeps one archive open and
 * purges it as soon as a request names another book, which workers running in
 * parallel would do all the time.
 */
const serveBooks = (): Plugin => ({
  name: "serve-books",
  configureServer(server) {
    const streamersByBook = new Map<string, ServiceWorkerStreamer>()

    const getBookStreamer = (book: string) => {
      const existingStreamer = streamersByBook.get(book)

      if (existingStreamer) return existingStreamer

      const streamer = new ServiceWorkerStreamer({
        getUriInfo: ({ request }) => ({
          baseUrl: `${new URL(request.url).origin}${STREAMER_PATH}`,
        }),
        getArchive: async () =>
          createArchiveFromJszip(
            await JSZip.loadAsync(
              await readFile(resolve(BOOKS_DIRECTORY, book)),
            ),
          ),
      })

      streamersByBook.set(book, streamer)

      return streamer
    }

    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? "", `http://${req.headers.host}`)

      if (!url.pathname.startsWith(`${STREAMER_PATH}/`)) return next()

      const [encodedBook = ""] = url.pathname
        .slice(`${STREAMER_PATH}/`.length)
        .split("/")
      const book = decodeURIComponent(encodedBook)

      // only the files of the books directory
      if (basename(book) !== book) return next()

      const range = req.headers.range

      getBookStreamer(book).fetchEventListener({
        request: new Request(url, { headers: range ? { range } : {} }),
        respondWith: async (pendingResponse) => {
          try {
            const response = await pendingResponse

            res.statusCode = response.status
            response.headers.forEach((value, name) => {
              res.setHeader(name, value)
            })
            res.end(Buffer.from(await response.arrayBuffer()))
          } catch (error) {
            next(error)
          }
        },
      })
    })
  },
})

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
    plugins: [serveBooks(), serveRawPdfWorker(), react()],
  }
})

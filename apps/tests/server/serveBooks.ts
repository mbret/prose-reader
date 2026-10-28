import { readFile } from "node:fs/promises"
import { basename, resolve } from "node:path"
import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { ServiceWorkerStreamer } from "@prose-reader/streamer"
// CommonJS in Node, where a named import of it fails
import JSZip from "jszip"
import type { Plugin } from "vite"

const BOOKS_DIRECTORY = resolve(import.meta.dirname, "../public/epubs")
const BOOKS_PATH = "/epubs"
const STREAMER_PATH = "/streamer"

type RewrittenBook = {
  /** The file of `public/epubs` it is made from. */
  fixture: string
  /** Rewrites the content of each of the fixture's xhtml pages. */
  rewritePage: (fixturePage: string) => string
}

/**
 * Books made from a fixture by rewriting each of its pages, for the scenarios
 * that need a fixture to differ in one way. Each is served beside the files of
 * `public/epubs`, as one of them, so that a scenario opens it the same way
 * whichever way it loads its book.
 */
const REWRITTEN_BOOKS = new Map<string, RewrittenBook>([
  [
    "accessible_epub_3-lazy-images.epub",
    {
      fixture: "accessible_epub_3.epub",
      /**
       * Gives every image `loading="lazy"`, and a top margin that keeps it far
       * beyond any engine's lazy loading distance while its page loads.
       */
      rewritePage: (fixturePage) =>
        fixturePage.replace(
          /<img /g,
          '<img loading="lazy" style="margin-top: 10000px" ',
        ),
    },
  ],
  [
    "sous-le-vent-without-stylesheets.epub",
    {
      fixture: "sous-le-vent.epub",
      rewritePage: (fixturePage) =>
        fixturePage.replace(/<link [^>]*rel="stylesheet"[^>]*\/>/g, ""),
    },
  ],
])

/** A file of `public/epubs`, or one of `REWRITTEN_BOOKS`. */
const loadBook = async (book: string) => {
  const rewrittenBook = REWRITTEN_BOOKS.get(book)
  const bookZip = await JSZip.loadAsync(
    await readFile(resolve(BOOKS_DIRECTORY, rewrittenBook?.fixture ?? book)),
  )

  if (rewrittenBook) {
    for (const page of bookZip.file(/\.xhtml$/)) {
      bookZip.file(
        page.name,
        rewrittenBook.rewritePage(await page.async("string")),
      )
    }
  }

  return bookZip
}

/**
 * The book named by the first segment after `path` in `pathname`, if it is a
 * bare file name: no request reaches outside the books directory.
 */
const getRequestedBook = (pathname: string, path: string) => {
  if (!pathname.startsWith(`${path}/`)) return undefined

  const [encodedBook = ""] = pathname.slice(`${path}/`.length).split("/")
  const book = decodeURIComponent(encodedBook)

  return basename(book) === book ? book : undefined
}

/**
 * Streams the fixture books over http, as an app's service worker or server
 * streams a book: `/streamer/<book>/manifest` is the manifest of the book, and
 * its hrefs point at `/streamer/<book>/<path>`, on the page's origin, so the
 * reader loads each document straight from its url. `tests/fixtureBook.ts`
 * opens a book from there.
 *
 * It also serves each of `REWRITTEN_BOOKS` at `/epubs/<book>`, where Vite
 * serves the files of `public/epubs`.
 *
 * Each book has a streamer of its own: a streamer keeps one archive open and
 * purges it as soon as a request names another book, which workers running in
 * parallel would do all the time.
 */
export const serveBooks = (): Plugin => ({
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
        getArchive: async () => createArchiveFromJszip(await loadBook(book)),
      })

      streamersByBook.set(book, streamer)

      return streamer
    }

    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? "", `http://${req.headers.host}`)
      const requestedBook = getRequestedBook(url.pathname, BOOKS_PATH)

      // Vite serves the files
      if (!requestedBook || !REWRITTEN_BOOKS.has(requestedBook)) return next()

      loadBook(requestedBook)
        .then((bookZip) => bookZip.generateAsync({ type: "nodebuffer" }))
        .then((bookFile) => {
          res.setHeader("Content-Type", "application/epub+zip")
          res.end(bookFile)
        }, next)
    })

    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? "", `http://${req.headers.host}`)
      const requestedBook = getRequestedBook(url.pathname, STREAMER_PATH)

      if (!requestedBook) return next()

      const range = req.headers.range

      getBookStreamer(requestedBook).fetchEventListener({
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

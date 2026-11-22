import { readFile } from "node:fs/promises"
import { basename, extname, resolve } from "node:path"
import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { ServiceWorkerStreamer } from "@prose-reader/streamer"
// CommonJS in Node, where a named import of it fails
import JSZip from "jszip"
import type { Plugin } from "vite"
import { LONG_COMIC_NUMBER_OF_PAGES } from "./longComic.ts"

const BOOKS_DIRECTORY = resolve(import.meta.dirname, "../public/epubs")
const FONTS_DIRECTORY = resolve(import.meta.dirname, "fonts")
const BOOKS_PATH = "/epubs"
const STREAMER_PATH = "/streamer"

type RewrittenBook = {
  /** The file of `public/epubs` it is made from. */
  fixture: string
  rewrite: (bookZip: JSZip) => Promise<void>
}

const rewriteEachXhtmlPage =
  (rewritePage: (fixturePage: string) => string) => async (bookZip: JSZip) => {
    for (const page of bookZip.file(/\.xhtml$/)) {
      bookZip.file(page.name, rewritePage(await page.async("string")))
    }
  }

/**
 * Replaces `pattern` in a file of the fixture. A fixture without it would make
 * a book that differs in no way, and the spec would blame the reader.
 */
const replaceInFixture = (
  fixtureFile: string,
  pattern: string,
  replacement: string,
) => {
  if (!fixtureFile.includes(pattern)) {
    throw new Error(`the fixture has no ${pattern}`)
  }

  return fixtureFile.replace(pattern, replacement)
}

const inOrder =
  (...rewrites: RewrittenBook["rewrite"][]): RewrittenBook["rewrite"] =>
  async (bookZip) => {
    for (const rewrite of rewrites) await rewrite(bookZip)
  }

/**
 * The faces of Liberation Sans that `accessible_epub_3-liberation-sans.epub`
 * embeds. The family keeps a name of its own, so that a font the machine has
 * under the same name cannot stand in for it.
 */
const LIBERATION_SANS_FACES = [
  { fontWeight: 400, file: "LiberationSans-Regular.ttf" },
  { fontWeight: 700, file: "LiberationSans-Bold.ttf" },
]
const LIBERATION_SANS_FAMILY = "Embedded Liberation Sans"

/**
 * Adds the faces of Liberation Sans to `accessible_epub_3.epub`: the files,
 * their items in the manifest, and their `@font-face` in the stylesheet every
 * page links.
 */
const embedLiberationSans = async (bookZip: JSZip) => {
  const [packageDocument] = bookZip.file(/\.opf$/)
  const stylesheet = bookZip.file("EPUB/css/epub.css")

  if (!packageDocument) throw new Error("the fixture has no package document")
  if (!stylesheet) throw new Error("the fixture has no EPUB/css/epub.css")

  let manifestItems = ""
  let fontFaces = ""

  for (const { fontWeight, file } of LIBERATION_SANS_FACES) {
    bookZip.file(
      `EPUB/fonts/${file}`,
      await readFile(resolve(FONTS_DIRECTORY, file)),
    )
    manifestItems += `<item id="${file}" href="fonts/${file}" media-type="font/ttf"/>`
    fontFaces += `@font-face { font-family: "${LIBERATION_SANS_FAMILY}"; font-weight: ${fontWeight}; src: url(../fonts/${file}); }\n`
  }

  bookZip.file(
    packageDocument.name,
    replaceInFixture(
      await packageDocument.async("string"),
      "</manifest>",
      `${manifestItems}</manifest>`,
    ),
  )
  bookZip.file(
    stylesheet.name,
    `${await stylesheet.async("string")}\n${fontFaces}`,
  )
}

const rewritePackageDocument =
  (rewriteFixturePackageDocument: (fixturePackageDocument: string) => string) =>
  async (bookZip: JSZip) => {
    const [packageDocument] = bookZip.file(/\.opf$/)

    if (!packageDocument) throw new Error("the fixture has no package document")

    bookZip.file(
      packageDocument.name,
      rewriteFixturePackageDocument(await packageDocument.async("string")),
    )
  }

const makeSpineProgressRightToLeft = rewritePackageDocument(
  (fixturePackageDocument) =>
    replaceInFixture(
      fixturePackageDocument,
      "<spine>",
      '<spine page-progression-direction="rtl">',
    ),
)

/**
 * Books made from a fixture by rewriting it, for the scenarios that need a
 * fixture to differ in one way. Each is served beside the files of
 * `public/epubs`, as one of them, so that a scenario opens it the same way
 * whichever way it loads its book.
 */
const REWRITTEN_BOOKS = new Map<string, RewrittenBook>([
  [
    "long-comic.cbz",
    {
      fixture: "koreader-pages.cbz",
      rewrite: async (bookZip) => {
        const firstPage = await bookZip.file("p01.jpg")?.async("uint8array")

        if (!firstPage) throw new Error("the fixture has no p01.jpg")

        for (const name of Object.keys(bookZip.files)) {
          bookZip.remove(name)
        }

        for (let page = 1; page <= LONG_COMIC_NUMBER_OF_PAGES; page++) {
          bookZip.file(`p${String(page).padStart(4, "0")}.jpg`, firstPage)
        }
      },
    },
  ],
  [
    "accessible_epub_3-lazy-images.epub",
    {
      fixture: "accessible_epub_3.epub",
      /**
       * Gives every image `loading="lazy"`, and a top margin that keeps it far
       * beyond any engine's lazy loading distance while its page loads.
       */
      rewrite: rewriteEachXhtmlPage((fixturePage) =>
        fixturePage.replace(
          /<img /g,
          '<img loading="lazy" style="margin-top: 10000px" ',
        ),
      ),
    },
  ],
  [
    "accessible_epub_3-liberation-sans.epub",
    {
      fixture: "accessible_epub_3.epub",
      /**
       * Sets the text in Liberation Sans, which the book embeds. Unlike the
       * book's own font, it has a bold face, whose glyphs are wider, and it is
       * the same font on every machine.
       */
      rewrite: inOrder(
        embedLiberationSans,
        rewriteEachXhtmlPage((fixturePage) =>
          replaceInFixture(
            fixturePage,
            "</head>",
            `<style>body, body * { font-family: "${LIBERATION_SANS_FAMILY}" !important; }</style></head>`,
          ),
        ),
      ),
    },
  ],
  [
    "accessible_epub_3-rtl.epub",
    {
      fixture: "accessible_epub_3.epub",
      /**
       * The columns of each page progress from right to left, as the spine
       * does. The words stay English.
       */
      rewrite: inOrder(
        makeSpineProgressRightToLeft,
        rewriteEachXhtmlPage((fixturePage) =>
          replaceInFixture(fixturePage, "<html ", '<html dir="rtl" '),
        ),
      ),
    },
  ],
  [
    "accessible_epub_3-vertical-rl.epub",
    {
      fixture: "accessible_epub_3.epub",
      /** Vertical writing as in Japanese, where pages also turn from right to left. */
      rewrite: inOrder(
        makeSpineProgressRightToLeft,
        rewriteEachXhtmlPage((fixturePage) =>
          replaceInFixture(
            fixturePage,
            "</head>",
            "<style>html { writing-mode: vertical-rl; }</style></head>",
          ),
        ),
      ),
    },
  ],
  [
    "haruko-html-jpeg-pre-paginated-blank-pages.epub",
    {
      fixture: "haruko-html-jpeg.epub",
      /**
       * Without `about`, its only reflowable item, so the book is fully
       * pre-paginated. In spreads, its last page then shares its spread with
       * a blank page, as its first page already does. Its fourth page asks
       * for the left side of a spread, so it and the fifth page each share
       * theirs with a blank page too.
       */
      rewrite: inOrder(
        rewritePackageDocument((fixturePackageDocument) =>
          replaceInFixture(
            fixturePackageDocument,
            '<itemref idref="about"  properties="page-spread-left rendition:layout-reflowable"  />',
            "",
          ),
        ),
        rewritePackageDocument((fixturePackageDocument) =>
          replaceInFixture(
            fixturePackageDocument,
            '<itemref idref="p04" properties="page-spread-right" />',
            '<itemref idref="p04" properties="page-spread-left" />',
          ),
        ),
      ),
    },
  ],
  [
    "sous-le-vent-without-stylesheets.epub",
    {
      fixture: "sous-le-vent.epub",
      rewrite: rewriteEachXhtmlPage((fixturePage) =>
        fixturePage.replace(/<link [^>]*rel="stylesheet"[^>]*\/>/g, ""),
      ),
    },
  ],
])

/** A file of `public/epubs`, or one of `REWRITTEN_BOOKS`. */
const loadBook = async (book: string) => {
  const rewrittenBook = REWRITTEN_BOOKS.get(book)
  const bookZip = await JSZip.loadAsync(
    await readFile(resolve(BOOKS_DIRECTORY, rewrittenBook?.fixture ?? book)),
  )

  await rewrittenBook?.rewrite(bookZip)

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
          // The type Vite gives a file of `public/epubs`: none for a comic
          if (extname(requestedBook) === ".epub") {
            res.setHeader("Content-Type", "application/epub+zip")
          }
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
            /**
             * Lets the page cache each file of a book. The reader opens several
             * spine items at once, and the frame of each one requests the same
             * stylesheets and fonts: uncached, every frame waits for its own
             * copy, which the streamer unzips again. A test starts with an
             * empty cache, in a browser context of its own.
             */
            if (response.ok) res.setHeader("Cache-Control", "max-age=60")
            res.end(Buffer.from(await response.arrayBuffer()))
          } catch (error) {
            next(error)
          }
        },
      })
    })
  },
})

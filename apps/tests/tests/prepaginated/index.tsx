import { createReader } from "@prose-reader/core"
import { openFixtureBook } from "../fixtureBook"

window.__PROSE_READER_DEBUG = true

async function run() {
  // `server/serveBooks.ts` makes the book without stylesheets.
  const book = await openFixtureBook(
    new URLSearchParams(window.location.search).has("withoutStylesheets")
      ? "sous-le-vent-without-stylesheets.epub"
      : "sous-le-vent.epub",
  )

  const reader = createReader({
    ...book,
    numberOfAdjacentSpineItemToPreLoad: 0,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  /**
   * Finally we can mount the reader.
   */
  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error
  window.reader = reader
}

run()

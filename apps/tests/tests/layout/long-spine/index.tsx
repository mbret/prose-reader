import { createReader } from "@prose-reader/core"
import { openFixtureBook } from "../../fixtureBook"

async function run() {
  // `server/serveBooks.ts` makes the book.
  const book = await openFixtureBook("long-comic.cbz")

  const reader = createReader({
    ...book,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // biome-ignore lint/style/noNonNullAssertion: the page always has #app
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error read by the spec
  window.reader = reader
}

run()

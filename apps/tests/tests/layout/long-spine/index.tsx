import { createReader } from "@prose-reader/core"
import { openFixtureBook } from "../../fixtureBook"

/** A comic of a thousand pages, one spine item each (see `server/serveBooks.ts`). */
async function run() {
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

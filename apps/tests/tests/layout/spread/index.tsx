import { createReader } from "@prose-reader/core"
import { openFixtureBook } from "../../fixtureBook"

async function run() {
  const book = await openFixtureBook("haruko-html-jpeg.epub")

  const reader = createReader({
    ...book,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // biome-ignore lint/style/noNonNullAssertion: the page always has #app
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for the spec
  window.reader = reader
}

run()

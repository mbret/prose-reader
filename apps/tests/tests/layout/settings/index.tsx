import { createReader } from "@prose-reader/core"
import { openFixtureBook } from "../../fixtureBook"

/**
 * A book of one image per page, created with the default left to right page
 * turn, so a spec can change the settings that decide where the pages go.
 */
async function run() {
  const book = await openFixtureBook("sample.cbz")

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

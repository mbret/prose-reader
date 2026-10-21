import { createReader } from "@prose-reader/core"
import { openFixtureBook } from "../../../fixtureBook"

async function run() {
  const book = await openFixtureBook("haruko-html-jpeg.epub")

  const query = new URLSearchParams(window.location.search)
  const cfi = query.get("cfi")

  const reader = createReader({
    ...book,
    target: cfi ? { type: "cfi", value: cfi } : undefined,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
}

run()

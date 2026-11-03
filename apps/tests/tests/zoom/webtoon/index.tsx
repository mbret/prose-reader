import { createReader } from "@prose-reader/core"
import { openFixtureBook } from "../../fixtureBook"

async function run() {
  const book = await openFixtureBook("rendition-flow-webtoon.epub")

  const query = new URLSearchParams(window.location.search)
  const cfi = query.get("cfi")
  const preload = query.get("preload")

  const reader = createReader({
    ...book,
    target: cfi ? { type: "cfi", value: cfi } : undefined,
    ...(preload !== null && {
      numberOfAdjacentSpineItemToPreLoad: Number(preload),
    }),
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
}

run()

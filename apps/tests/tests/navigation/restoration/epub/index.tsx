import { createReader, type ReadingPosition } from "@prose-reader/core"
import { openFixtureBook } from "../../../fixtureBook"

async function run() {
  const book = await openFixtureBook("accessible_epub_3.epub")

  const query = new URLSearchParams(window.location.search)
  const cfi = query.get("cfi")
  const preload = query.get("preload")
  const pageHorizontalMargin = query.get("pageHorizontalMargin")

  const reader = createReader({
    ...book,
    target: cfi ? { type: "cfi", value: cfi } : undefined,
    ...(preload !== null && {
      numberOfAdjacentSpineItemToPreLoad: Number(preload),
    }),
    ...(pageHorizontalMargin !== null && {
      pageHorizontalMargin: Number(pageHorizontalMargin),
    }),
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // Every reading position from the reader's creation on, earlier than a spec
  // can subscribe.
  const readingPositions: ReadingPosition[] = []

  reader.navigation.readingPosition$.subscribe((readingPosition) => {
    readingPositions.push(readingPosition)
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the specs
  window.readingPositions = readingPositions
}

run()

import { createReader, type ReadingPosition } from "@prose-reader/core"
import { koreaderEnhancer } from "@prose-reader/enhancer-koreader"
import { generateXPointer, xPointerToCfi } from "@prose-reader/koreader"
import { openFixtureBook } from "../fixtureBook"

async function run() {
  const book = await openFixtureBook("accessible_epub_3.epub")

  const query = new URLSearchParams(window.location.search)
  const cfi = query.get("cfi")
  // A KOReader `progress` to open at, as a sync client opens at a pulled one.
  const progress = query.get("progress")
  const preload = query.get("preload")

  const reader = koreaderEnhancer(createReader)({
    ...book,
    target: progress
      ? { type: "koreaderProgress", value: progress }
      : cfi
        ? { type: "cfi", value: cfi }
        : undefined,
    ...(preload !== null && {
      numberOfAdjacentSpineItemToPreLoad: Number(preload),
    }),
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // Every reading position from the start, converted to KOReader's progress
  // as it comes, the way a sync client converts what it pushes: an xpointer,
  // for an EPUB.
  const readingPositionsAsXPointers: {
    xpointer: string | undefined
    status: ReadingPosition["status"]
  }[] = []

  reader.navigation.readingPosition$.subscribe(({ cfi, status }) => {
    readingPositionsAsXPointers.push({
      xpointer: reader.koreader.cfiToProgress(cfi),
      status,
    })
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for the spec
  window.reader = reader
  // @ts-expect-error export for the spec
  window.readingPositionsAsXPointers = readingPositionsAsXPointers
  // @ts-expect-error export for the spec
  window.koreader = { generateXPointer, xPointerToCfi }
}

run()

import { createReader } from "@prose-reader/core"
import { openFixtureBook } from "../../fixtureBook"

/**
 * A reflowable book opened at the `cfi` of the URL, so a spec can change the
 * settings that decide how many pages a chapter takes.
 */
async function run() {
  const book = await openFixtureBook("accessible_epub_3.epub")
  const cfi = new URLSearchParams(window.location.search).get("cfi")

  const reader = createReader({
    ...book,
    target: cfi ? { type: "cfi", value: cfi } : undefined,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // biome-ignore lint/style/noNonNullAssertion: the page always has #app
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error read by the spec
  window.reader = reader
}

run()

import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { openFixtureBook } from "../../fixtureBook"

async function run() {
  const book = await openFixtureBook("sample.cbz")

  const createReaderWithEnhancers = gesturesEnhancer(createReader)

  const reader = createReaderWithEnhancers({
    ...book,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
}

run()

import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { openFixtureBook } from "../../fixtureBook"

async function run() {
  const book = await openFixtureBook("sample.cbz")
  const query = new URLSearchParams(window.location.search)
  const panNavigation = query.get("panNavigation") === "swipe" ? "swipe" : "pan"

  const createReaderWithEnhancers = gesturesEnhancer(createReader)

  const reader = createReaderWithEnhancers({
    ...book,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    gestures: { panNavigation },
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
}

run()

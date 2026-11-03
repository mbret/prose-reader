import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { openFixtureBook } from "../../fixtureBook"

async function run() {
  const book = await openFixtureBook("accessible_epub_3.epub")

  const createReaderWithEnhancers = gesturesEnhancer(createReader)

  const reader = createReaderWithEnhancers({
    ...book,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // Every tap the enhancer reports, handled (it turned a page) or not (left
  // to the app, which toggles its menus on one), for the spec to read back.
  const taps: { x: number; button: number; handled: boolean }[] = []

  reader.gestures.gestures$.subscribe((gesture) => {
    if (gesture.type !== "tap") return

    taps.push({
      x: Math.round(gesture.gestureEvent.center.x),
      button: gesture.gestureEvent.event.button,
      handled: gesture.handled,
    })
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the spec
  window.taps = taps
}

run()

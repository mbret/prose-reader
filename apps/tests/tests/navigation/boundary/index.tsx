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

  // Hidden marker the spec asserts against. `data-count` is the total
  // number of boundary events; `data-last` is the most recent boundary
  // value ("start" | "end" | ""). `data-gestures` lists the gestures the
  // reader recognized, in order: "handled tap", "unhandled tap", or the
  // gesture's type.
  // biome-ignore lint/style/noNonNullAssertion: marker is in index.html
  const marker = document.getElementById("boundary-marker")!

  reader.navigation.outOfSpineBoundary$.subscribe(({ boundary }) => {
    const count = Number(marker.dataset.count ?? "0") + 1
    marker.dataset.count = String(count)
    marker.dataset.last = boundary
  })

  reader.gestures.gestures$.subscribe((gesture) => {
    const name =
      gesture.type === "tap"
        ? `${gesture.handled ? "handled" : "unhandled"} tap`
        : gesture.type
    marker.dataset.gestures = [marker.dataset.gestures, name]
      .filter(Boolean)
      .join(", ")
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
}

run()

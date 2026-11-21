import { createReader } from "@prose-reader/core"
import {
  type Annotation,
  annotationsEnhancer,
} from "@prose-reader/enhancer-annotations"
import { BehaviorSubject } from "rxjs"
import { openFixtureBook } from "../fixtureBook"
import { isScenarioBook, SCENARIO_BOOKS } from "../utils/scenarioBooks"

/**
 * A reader that shows the app's annotations as highlights, and nothing else:
 * nothing observes the taps on them.
 */
async function run() {
  const requestedBook = new URLSearchParams(window.location.search).get("book")
  const book = requestedBook ?? "ltr"

  if (!isScenarioBook(book))
    throw new Error(`this scenario has no ${book} book`)

  const annotations$ = new BehaviorSubject<Annotation[]>([])

  const reader = annotationsEnhancer(createReader)({
    ...(await openFixtureBook(SCENARIO_BOOKS[book])),
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    annotations: { annotations$ },
  })

  const container = document.getElementById(`app`)

  if (!container) throw new Error("the page has no app element")

  reader.mount(container)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the specs, which set the app's annotations
  window.annotations$ = annotations$
}

run()

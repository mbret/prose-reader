import { createReader } from "@prose-reader/core"
import {
  type Annotation,
  annotationsEnhancer,
} from "@prose-reader/enhancer-annotations"
import { BehaviorSubject } from "rxjs"
import { openFixtureBook } from "../fixtureBook"

/**
 * A reader that shows the app's annotations as highlights, and nothing else:
 * nothing observes the taps on them.
 */
async function run() {
  const annotations$ = new BehaviorSubject<Annotation[]>([])

  const reader = annotationsEnhancer(createReader)({
    ...(await openFixtureBook("accessible_epub_3.epub")),
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    annotations: { annotations$ },
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the specs, which set the app's annotations
  window.annotations$ = annotations$
}

run()

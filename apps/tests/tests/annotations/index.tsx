import { createReader } from "@prose-reader/core"
import {
  type Annotation,
  annotationsEnhancer,
} from "@prose-reader/enhancer-annotations"
import { BehaviorSubject } from "rxjs"
import { openFixtureBook } from "../fixtureBook"

/**
 * A reflowable book with the annotations enhancer, and the list of
 * annotations it draws, which the specs change. Nothing subscribes to
 * `highlightTap$`: an app that does not handle taps on highlights does not
 * either.
 */
async function run() {
  const book = await openFixtureBook("accessible_epub_3.epub")
  const annotations$ = new BehaviorSubject<Annotation[]>([])

  const reader = annotationsEnhancer(createReader)({
    ...book,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    annotations: { annotations$ },
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the specs
  window.annotations$ = annotations$
}

run()

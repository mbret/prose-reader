import { createReader, type DocumentRenderer } from "@prose-reader/core"
import { annotationsEnhancer } from "@prose-reader/enhancer-annotations"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import {
  BehaviorSubject,
  first,
  map,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs"
import { openFixtureBook } from "../../fixtureBook"

/**
 * A reader whose first item does not finish its layout until the spec
 * releases it, so the reader publishes no pages until then.
 */
async function run() {
  const book = await openFixtureBook("sample.cbz")

  const createReaderWithEnhancers = gesturesEnhancer(
    annotationsEnhancer(createReader),
  )

  const reader = createReaderWithEnhancers({
    ...book,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  const isFirstItemLayoutReleased = new BehaviorSubject(false)
  const firstItemRenderer: DocumentRenderer | undefined =
    reader.spineItemsManager.get(0)?.renderer

  if (!firstItemRenderer) throw new Error("the book has no first item")

  const layOutFirstItem = firstItemRenderer.onLayout.bind(firstItemRenderer)

  firstItemRenderer.onLayout = (params) =>
    isFirstItemLayoutReleased.pipe(
      first(Boolean),
      switchMap(() => layOutFirstItem(params)),
    )

  /**
   * The form of react-reader's bookmark hook: it reads the annotation
   * candidates with `withLatestFrom`. Records how many pages the reader had
   * published when each tap reached it.
   */
  const publishedPagesOnEachTap: number[] = []

  reader.gestures.hooks.register("beforeTapGesture", ({ event$ }) =>
    event$.pipe(
      tap(() => {
        publishedPagesOnEachTap.push(reader.spine.pages.value.pages.length)
      }),
      withLatestFrom(reader.annotations.candidates$),
      map(() => true),
    ),
  )

  // Every tap the enhancer reports, and whether its gestures ended.
  const taps: { handled: boolean }[] = []
  const gesturesEnd: { reason?: "error" | "complete" } = {}

  reader.gestures.gestures$.subscribe({
    next: (gesture) => {
      if (gesture.type === "tap") taps.push({ handled: gesture.handled })
    },
    error: () => {
      gesturesEnd.reason = "error"
    },
    complete: () => {
      gesturesEnd.reason = "complete"
    },
  })

  const container = document.getElementById(`app`)

  if (!container) throw new Error("the page has no app element")

  reader.mount(container)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the spec
  window.gesturesBeforeFirstPages = {
    taps,
    gesturesEnd,
    publishedPagesOnEachTap,
    releaseFirstItemLayout: () => isFirstItemLayoutReleased.next(true),
  }
}

run()

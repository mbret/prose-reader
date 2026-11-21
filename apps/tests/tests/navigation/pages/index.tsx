import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { map, tap } from "rxjs"
import { openFixtureBook } from "../../fixtureBook"
import { getFileOfRequestedScenarioBook } from "../../utils/scenarioBooks"
import type { TappedPage } from "./tappedPage"

async function run() {
  const reader = gesturesEnhancer(createReader)({
    ...(await openFixtureBook(getFileOfRequestedScenarioBook())),
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  const tappedPages: TappedPage[] = []

  reader.gestures.hooks.register("beforeTapGesture", ({ event$ }) =>
    event$.pipe(
      tap(({ page }) => {
        tappedPages.push(
          page && {
            spineItemIndex: page.spineItem.index,
            spineItemPageIndex: page.spineItemPageIndex,
            spineItemPagePosition: {
              x: page.spineItemPagePosition.x,
              y: page.spineItemPagePosition.y,
            },
            pageSize: page.pageSize,
          },
        )
      }),
      map(() => true),
    ),
  )

  const container = document.getElementById(`app`)

  if (!container) throw new Error("the page has no app element")

  reader.mount(container)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the specs
  window.tappedPages = tappedPages
}

run()

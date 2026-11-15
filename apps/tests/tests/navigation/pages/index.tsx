import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { map } from "rxjs"
import { openFixtureBook } from "../../fixtureBook"
import { BOOK_DIRECTIONS, isBookDirection, type TappedPage } from "./types"

async function run() {
  const query = new URLSearchParams(window.location.search)
  const direction = query.get("book") ?? "ltr"

  if (!isBookDirection(direction)) {
    throw new Error(`this scenario has no ${direction} book`)
  }

  // `server/serveBooks.ts` makes the right-to-left and vertical books.
  const book = await openFixtureBook(BOOK_DIRECTIONS[direction])

  const reader = gesturesEnhancer(createReader)({
    ...book,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // The page of every tap, as the `beforeTapGesture` hooks of an app get it.
  const tappedPages: TappedPage[] = []

  reader.gestures.hooks.register("beforeTapGesture", ({ event$ }) =>
    event$.pipe(
      map(({ page }) => {
        if (page) {
          tappedPages.push({
            spineItemIndex: page.spineItem.index,
            pageIndex: page.spineItemPageIndex,
            positionInPage: {
              x: page.spineItemPagePosition.x,
              y: page.spineItemPagePosition.y,
            },
            pageSize: page.pageSize,
          })
        }

        // Lets the tap go on.
        return true
      }),
    ),
  )

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the specs
  window.tappedPages = tappedPages
}

run()

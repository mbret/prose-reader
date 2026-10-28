import { expect, test } from "@playwright/test"
import { getReader } from "../../../utils/reader"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/**
 * An app may lay the book out again as soon as a navigation lands, from a
 * subscriber, as one changing a layout setting when the reader reaches a page
 * does. That layout voids the navigation while the reader still reports it.
 */
test.describe("Given an app that lays the book out again as soon as a page turn lands", () => {
  test("should keep the page turned to while the layout runs", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 536, height: 842 })
    await page.goto(`${url}?cfi=${encodeURIComponent("epubcfi(/6/14!/4/2)")}`)

    const reader = await getReader(page)

    // The turn has to land on the current layout for the layout to void it.
    await page.waitForFunction(
      (reader) =>
        reader.pagination.state.isSettled &&
        reader.spine.value.firstItemIndexAwaitingLayout === undefined,
      reader,
    )

    const turn = await reader.evaluate(async (reader) => {
      const pageOf = ({ begin }: typeof reader.pagination.state) =>
        `${begin.spineItemIndex}:${begin.pageIndexInSpineItem}`
      const pageBeforeTurn = pageOf(reader.pagination.state)
      const pagesReported: string[] = []
      let isTurning = false
      let turnNavigation: unknown
      let isLayoutCurrentWhenTurnReported: boolean | undefined
      let replayedOnceLayoutRequested:
        | { navigation: unknown; holdsOnCurrentLayout: boolean }
        | undefined

      const settledAfterLayout = new Promise<void>((resolve) => {
        reader.navigation.navigationAgainstCurrentLayout$.subscribe(
          ({ navigation }) => {
            if (!isTurning || turnNavigation) return

            turnNavigation = navigation
            isLayoutCurrentWhenTurnReported =
              reader.spine.value.firstItemIndexAwaitingLayout === undefined
            reader.layout()
            // Replays the current one, synchronously.
            reader.navigation.navigationAgainstCurrentLayout$
              .subscribe((value) => {
                replayedOnceLayoutRequested = value
              })
              .unsubscribe()
          },
        )
        reader.pagination.state$.subscribe((state) => {
          if (!isTurning) return

          pagesReported.push(pageOf(state))

          if (turnNavigation && state.isSettled) resolve()
        })
      })

      isTurning = true
      reader.navigation.turnRight()
      await settledAfterLayout

      return {
        pageBeforeTurn,
        pagesReported,
        isLayoutCurrentWhenTurnReported,
        replaysTheTurn:
          replayedOnceLayoutRequested?.navigation === turnNavigation,
        replayedHolds: replayedOnceLayoutRequested?.holdsOnCurrentLayout,
      }
    })

    // The turn landed on the current layout, on another page.
    expect(turn.isLayoutCurrentWhenTurnReported).toBe(true)
    expect(turn.pagesReported[turn.pagesReported.length - 1]).not.toBe(
      turn.pageBeforeTurn,
    )

    // The layout voids the turn's navigation, not the one before it.
    expect(turn.replaysTheTurn).toBe(true)
    expect(turn.replayedHolds).toBe(false)

    // The turn withdraws the page from before it, which is never reported again.
    expect(turn.pagesReported[0]).toBe(turn.pageBeforeTurn)
    expect(turn.pagesReported.slice(1)).not.toContain(turn.pageBeforeTurn)
  })
})

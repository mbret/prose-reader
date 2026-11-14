import { expect } from "@playwright/test"
import { waitForSettledOnCurrentLayout } from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import { test } from "../../utils/test"

test.describe("Given a book that scrolls, and a scroll of the user's that is not over", () => {
  test.describe("When the app goes to a cfi", () => {
    test("the scroll is over at once, and the navigation keeps the cfi as its target", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 300, height: 400 })
      await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")
      await waitForSettledOnCurrentLayout(page)

      const reader = await getReader(page)
      const spineItemIndex = 8

      /**
       * In one task of the page, so that the navigation comes well inside the
       * 500 ms that the reader takes a scroll of the user's to last.
       */
      const { cfi, isNavigationLockedAfterNavigation } = await reader.evaluate(
        async (reader, spineItemIndex) => {
          const scrollElement =
            reader.navigation.scrollNavigationController.value.element
          const spineItem = reader.spineItemsManager.get(spineItemIndex)

          if (!scrollElement || !spineItem) {
            throw new Error(`no scroll element or no spine item`)
          }

          const cfi = reader.cfi.generateRootCfi(spineItem.item)

          // The reader cannot tell this scroll from one of the user's.
          scrollElement.scrollTo({ top: scrollElement.scrollTop + 150 })

          // The scroll holds the lock from the first move the browser reports.
          await new Promise<void>((resolve) => {
            const lock = reader.navigation.isLocked$.subscribe((isLocked) => {
              if (!isLocked) return

              resolve()
              queueMicrotask(() => lock.unsubscribe())
            })
          })

          reader.navigation.goToCfi(cfi, { animate: false })

          // The scroll ends once every listener has heard of the navigation.
          await new Promise((resolve) => setTimeout(resolve))

          let isNavigationLockedAfterNavigation = true

          reader.navigation.isLocked$
            .subscribe((isLocked) => {
              isNavigationLockedAfterNavigation = isLocked
            })
            .unsubscribe()

          return { cfi, isNavigationLockedAfterNavigation }
        },
        spineItemIndex,
      )

      expect
        .soft(
          isNavigationLockedAfterNavigation,
          "whether the scroll still holds the lock, right after the navigation",
        )
        .toBe(false)

      // The scroll is over, however it ended, and the reader has settled.
      await page.waitForFunction((reader) => {
        let isNavigationLocked = true

        reader.navigation.isLocked$
          .subscribe((isLocked) => {
            isNavigationLocked = isLocked
          })
          .unsubscribe()

        return (
          !isNavigationLocked &&
          reader.spine.isLayoutCurrent() &&
          reader.pagination.state.isSettled
        )
      }, reader)

      const navigation = await reader.evaluate((reader, spineItemIndex) => {
        const { target, spineItem } = reader.navigation.getNavigation()
        const readerElement = reader.context.value.rootElement
        const spineItemElement =
          reader.spineItemsManager.get(spineItemIndex)?.containerElement

        if (!readerElement || !spineItemElement) {
          throw new Error(`no reader element or no spine item`)
        }

        return {
          target,
          spineItem,
          distanceFromTopOfSpineItemToTopOfReader:
            readerElement.getBoundingClientRect().top -
            spineItemElement.getBoundingClientRect().top,
        }
      }, spineItemIndex)

      expect(navigation.target, "the target of the navigation").toEqual({
        type: "cfi",
        value: cfi,
      })
      expect(navigation.spineItem).toBe(spineItemIndex)
      // The reader shows the start of that spine item, to less than a pixel.
      expect(navigation.distanceFromTopOfSpineItemToTopOfReader).toBeCloseTo(
        0,
        0,
      )
    })
  })
})

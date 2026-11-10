import type { Page } from "@playwright/test"
import { getReader } from "./reader"

/**
 * Keeps the documents of some spine items loading from now on, as a slow
 * `item.onDocumentLoad` hook does, so that they keep the size they have
 * before they load. Resolves to a handle on the function that lets them
 * finish. A spec calls it in the page, where it can let them finish in the
 * same task as something else.
 */
export const holdLoadOfSpineItems = async (
  page: Page,
  spineItemIndexes: number[],
) =>
  (await getReader(page)).evaluateHandle((reader, spineItemIndexes) => {
    let letLoadsFinish = () => {}
    const loadsMayFinish = new Promise<void>((resolve) => {
      letLoadsFinish = resolve
    })
    const idsOfSpineItemsHeld = new Set(
      spineItemIndexes.map(
        (spineItemIndex) =>
          reader.spineItemsManager.get(spineItemIndex)?.item.id,
      ),
    )

    reader.hookManager.register("item.onDocumentLoad", async ({ itemId }) => {
      if (idsOfSpineItemsHeld.has(itemId)) await loadsMayFinish
    })

    return letLoadsFinish
  }, spineItemIndexes)

/**
 * How far below the top of a spine item the top of the screen is, as the page
 * renders them: the place of that spine item a book that scrolls shows.
 */
export const getDistanceFromTopOfSpineItemToTopOfScreen = async (
  page: Page,
  spineItemIndex: number,
) =>
  (await getReader(page)).evaluate((reader, spineItemIndex) => {
    const scrollElement =
      reader.navigation.scrollNavigationController.value.element
    const spineItem = reader.spineItemsManager.get(spineItemIndex)

    if (!scrollElement || !spineItem) {
      throw new Error(`no scroll element or no spine item ${spineItemIndex}`)
    }

    return (
      scrollElement.getBoundingClientRect().top -
      spineItem.containerElement.getBoundingClientRect().top
    )
  }, spineItemIndex)

/**
 * Records `getDistanceFromTopOfSpineItemToTopOfScreen` at each frame from now
 * on: the place each frame shows. Resolves to a function that gives the
 * distances so far, one per frame.
 */
export const recordDistanceFromTopOfSpineItemToTopOfScreenAtEachFrame = async (
  page: Page,
  spineItemIndex: number,
) => {
  const distancesRecordedInPage = await (await getReader(page)).evaluateHandle(
    (reader, spineItemIndex) => {
      const scrollElement =
        reader.navigation.scrollNavigationController.value.element
      const spineItem = reader.spineItemsManager.get(spineItemIndex)

      if (!scrollElement || !spineItem) {
        throw new Error(`no scroll element or no spine item ${spineItemIndex}`)
      }

      const distances: number[] = []
      const recordAtEachFrame = () => {
        distances.push(
          scrollElement.getBoundingClientRect().top -
            spineItem.containerElement.getBoundingClientRect().top,
        )
        requestAnimationFrame(recordAtEachFrame)
      }

      requestAnimationFrame(recordAtEachFrame)

      return distances
    },
    spineItemIndex,
  )

  return () => distancesRecordedInPage.jsonValue()
}

/**
 * Waits until some spine items are loaded, the layout their load ended with
 * is current, pagination has settled on it, and nothing holds the navigation
 * lock, such as a scroll of the user's that is not over. Called after the
 * loads were let finish, it accepts nothing from before: a load that ends
 * asks for a layout in the same task.
 */
export const waitForSpineItemsLoadedAndReaderAtRest = async (
  page: Page,
  spineItemIndexes: number[],
) => {
  const reader = await getReader(page)

  await page.waitForFunction(
    ({ reader, spineItemIndexes }) => {
      let isNavigationLocked = true

      // Replays whether the lock is held now.
      reader.navigation.isLocked$
        .subscribe((isLocked) => {
          isNavigationLocked = isLocked
        })
        .unsubscribe()

      return (
        spineItemIndexes.every(
          (spineItemIndex) =>
            reader.spineItemsManager.get(spineItemIndex)?.value.loadStatus ===
            "loaded",
        ) &&
        reader.spine.isLayoutCurrent() &&
        reader.pagination.state.isSettled &&
        !isNavigationLocked
      )
    },
    { reader, spineItemIndexes },
  )
}

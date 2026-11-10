import type { Page } from "@playwright/test"
import { getReader } from "./reader"

/**
 * Keeps the documents of some spine items from finishing their load, from now
 * on: each one waits at its `item.onDocumentLoad` hooks, as behind a slow
 * hook, so it keeps the size it has before it loads. Resolves to a handle on
 * what holds them, which a spec uses in the page:
 *
 * - `areAllWaiting()` says whether each of them has reached its hooks. Until
 *   then, one that still fetches would finish at a time of its own.
 * - `letLoadsFinish()` lets them all finish. Called in the page, it can share
 *   its task with something else.
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
    const idsOfSpineItemsHeld = spineItemIndexes.map(
      (spineItemIndex) => reader.spineItemsManager.get(spineItemIndex)?.item.id,
    )
    const idsOfSpineItemsWaiting = new Set<string>()

    reader.hookManager.register("item.onDocumentLoad", async ({ itemId }) => {
      if (!idsOfSpineItemsHeld.includes(itemId)) return

      idsOfSpineItemsWaiting.add(itemId)
      await loadsMayFinish
    })

    return {
      areAllWaiting: () =>
        idsOfSpineItemsHeld.every(
          (itemId) =>
            itemId !== undefined && idsOfSpineItemsWaiting.has(itemId),
        ),
      letLoadsFinish,
    }
  }, spineItemIndexes)

/**
 * Where a spine item is and what the screen shows of it, in a book that
 * scrolls:
 *
 * - `topInSpine`: the top of the spine item in the spine, as the latest
 *   completed layout has it. A layout that grows a spine item before it moves
 *   it down.
 * - `distanceToTopOfScreen`: how far below the top of the spine item the top
 *   of the screen is, as the page renders them. It is the place of the spine
 *   item that the screen shows.
 */
export const getPlaceOfSpineItem = async (page: Page, spineItemIndex: number) =>
  (await getReader(page)).evaluate((reader, spineItemIndex) => {
    const scrollElement =
      reader.navigation.scrollNavigationController.value.element
    const spineItem = reader.spineItemsManager.get(spineItemIndex)

    if (!scrollElement || !spineItem) {
      throw new Error(`no scroll element or no spine item ${spineItemIndex}`)
    }

    return {
      topInSpine: reader.spine.getSpineItemSpineLayoutInfo(spineItem).top,
      distanceToTopOfScreen:
        scrollElement.getBoundingClientRect().top -
        spineItem.containerElement.getBoundingClientRect().top,
    }
  }, spineItemIndex)

/**
 * Records, once each frame is drawn from now on, how far below the top of a
 * spine item the top of the screen is: the place each frame showed. Resolves
 * to a function that stops the record and gives the distances, one per frame.
 *
 * A frame is drawn after its animation frame callbacks, and the reader works
 * in some of them. So the read waits for the task that follows them, the way
 * a message posted from one of them does.
 */
export const recordDistanceFromTopOfSpineItemToTopOfScreenAtEachFrame = async (
  page: Page,
  spineItemIndex: number,
) => {
  const recordInPage = await (await getReader(page)).evaluateHandle(
    (reader, spineItemIndex) => {
      const scrollElement =
        reader.navigation.scrollNavigationController.value.element
      const spineItem = reader.spineItemsManager.get(spineItemIndex)

      if (!scrollElement || !spineItem) {
        throw new Error(`no scroll element or no spine item ${spineItemIndex}`)
      }

      const distances: number[] = []
      const record = { distances, isStopped: false }
      const { port1: afterFrameIsDrawn, port2: frame } = new MessageChannel()

      afterFrameIsDrawn.onmessage = () => {
        record.distances.push(
          scrollElement.getBoundingClientRect().top -
            spineItem.containerElement.getBoundingClientRect().top,
        )
      }

      const postAtEachFrame = () => {
        if (record.isStopped) return

        frame.postMessage(undefined)
        requestAnimationFrame(postAtEachFrame)
      }

      requestAnimationFrame(postAtEachFrame)

      return record
    },
    spineItemIndex,
  )

  return () =>
    recordInPage.evaluate((record) => {
      record.isStopped = true

      return record.distances
    })
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

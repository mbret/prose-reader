import { expect, type Page } from "@playwright/test"
import { navigateToSpineItem, waitForSpineItemReady } from "./index"
import { waitForSettledOnCurrentLayout } from "./pagination"
import { getReader } from "./reader"

/**
 * Keeps the documents of some spine items from finishing their load, from now
 * on: each one waits at its `item.onDocumentLoad` hooks, as behind a slow
 * hook, so it keeps the size it has before it loads. Resolves to a handle on
 * what holds them, which a spec uses in the page:
 *
 * - `areAllWaiting()` says whether each of them has reached its hooks. Until
 *   then, one that still fetches would finish at a time of its own.
 * - `letLoadsFinish()` lets them all finish.
 */
const holdLoadOfSpineItems = async (page: Page, spineItemIndexes: number[]) =>
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
 * Where a spine item is in the spine, as the latest completed layout has it,
 * and how far its top left corner is from the reader's, as the page renders
 * them: the place of that spine item the reader shows.
 */
const getPlaceOfSpineItem = async (page: Page, spineItemIndex: number) =>
  (await getReader(page)).evaluate((reader, spineItemIndex) => {
    const readerElement = reader.context.value.rootElement
    const spineItem = reader.spineItemsManager.get(spineItemIndex)

    if (!readerElement || !spineItem) {
      throw new Error(`no reader element or no spine item ${spineItemIndex}`)
    }

    const { left, top } = reader.spine.getSpineItemSpineLayoutInfo(spineItem)
    const readerBox = readerElement.getBoundingClientRect()
    const spineItemBox = spineItem.containerElement.getBoundingClientRect()

    return {
      placeInSpine: { left, top },
      distanceToCornerOfReader: {
        x: readerBox.left - spineItemBox.left,
        y: readerBox.top - spineItemBox.top,
      },
    }
  }, spineItemIndex)

/**
 * Records, once each frame is drawn from now on, how far the top left corner
 * of a spine item is from the reader's: the place each frame showed. Resolves
 * to a function that stops the record and gives the distances, one per frame.
 *
 * A frame is drawn after its animation frame callbacks, and the reader works
 * in some of them. So the read waits for the task that follows them, the way
 * a message posted from one of them does.
 */
const recordDistanceFromSpineItemToCornerOfReaderAtEachFrame = async (
  page: Page,
  spineItemIndex: number,
) => {
  const recordInPage = await (await getReader(page)).evaluateHandle(
    (reader, spineItemIndex) => {
      const readerElement = reader.context.value.rootElement
      const spineItem = reader.spineItemsManager.get(spineItemIndex)

      if (!readerElement || !spineItem) {
        throw new Error(`no reader element or no spine item ${spineItemIndex}`)
      }

      const distances: { x: number; y: number }[] = []
      const record = { distances, isStopped: false }
      const { port1: afterFrameIsDrawn, port2: frame } = new MessageChannel()

      afterFrameIsDrawn.onmessage = () => {
        const readerBox = readerElement.getBoundingClientRect()
        const spineItemBox = spineItem.containerElement.getBoundingClientRect()

        distances.push({
          x: readerBox.left - spineItemBox.left,
          y: readerBox.top - spineItemBox.top,
        })
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

const isAwayFromCorner = ({ x, y }: { x: number; y: number }) =>
  Math.abs(x) >= 1 || Math.abs(y) >= 1

/**
 * Expects every frame to show the start of a spine item, before, while and
 * after something moves that spine item in the spine. The reader shows its
 * start as this is called. `moveSpineItemInSpine` resolves once the reader
 * has laid out and its result has settled on that layout.
 */
export const expectEveryFrameToShowStartOfSpineItemWhile = async (
  page: Page,
  spineItemIndex: number,
  moveSpineItemInSpine: () => Promise<void>,
) => {
  const placeBefore = await getPlaceOfSpineItem(page, spineItemIndex)

  expect(
    isAwayFromCorner(placeBefore.distanceToCornerOfReader),
    "whether the reader shows another place than the start of the spine item, before it moves",
  ).toBe(false)

  const stopAndGetDistancesAtEachFrame =
    await recordDistanceFromSpineItemToCornerOfReaderAtEachFrame(
      page,
      spineItemIndex,
    )

  await moveSpineItemInSpine()

  const distancesAtEachFrame = await stopAndGetDistancesAtEachFrame()
  const placeAfter = await getPlaceOfSpineItem(page, spineItemIndex)

  expect(
    placeAfter.placeInSpine,
    "the place of the spine item in the spine, which had to move",
  ).not.toEqual(placeBefore.placeInSpine)
  expect(distancesAtEachFrame.length).toBeGreaterThan(0)
  expect(
    distancesAtEachFrame.filter(isAwayFromCorner),
    "the distances from the spine item to the corner of the reader, at the frames that showed another place",
  ).toEqual([])
}

/**
 * Goes to the start of a spine item while the ones before it that load with
 * it wait at the end of their load. Resolves to a function that lets them
 * finish, and resolves once the reader has laid out for them and its result
 * has settled.
 */
export const goToSpineItemWithOnesBeforeItStillLoading = async (
  page: Page,
  {
    spineItemIndex,
    spineItemIndexesLoadingBefore,
  }: { spineItemIndex: number; spineItemIndexesLoadingBefore: number[] },
) => {
  const reader = await getReader(page)

  await waitForSettledOnCurrentLayout(page)

  const loadsHeld = await holdLoadOfSpineItems(
    page,
    spineItemIndexesLoadingBefore,
  )

  await navigateToSpineItem({ page, index: spineItemIndex })
  await waitForSpineItemReady(page, [spineItemIndex])
  await page.waitForFunction(
    (loadsHeld) => loadsHeld.areAllWaiting(),
    loadsHeld,
  )
  await waitForSettledOnCurrentLayout(page)

  return async () => {
    await loadsHeld.evaluate(({ letLoadsFinish }) => {
      letLoadsFinish()
    })

    /**
     * Nothing from before the loads satisfies this: a load that ends asks
     * for a layout in the same task.
     */
    await page.waitForFunction(
      ({ reader, spineItemIndexes }) =>
        spineItemIndexes.every(
          (spineItemIndex) =>
            reader.spineItemsManager.get(spineItemIndex)?.value.loadStatus ===
            "loaded",
        ) &&
        reader.spine.isLayoutCurrent() &&
        reader.pagination.state.isSettled,
      { reader, spineItemIndexes: spineItemIndexesLoadingBefore },
    )
  }
}

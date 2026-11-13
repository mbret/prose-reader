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
 * - `haveAllLoaded()` says whether they all have.
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
      haveAllLoaded: () =>
        spineItemIndexes.every(
          (spineItemIndex) =>
            reader.spineItemsManager.get(spineItemIndex)?.value.loadStatus ===
            "loaded",
        ),
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

type DistanceToCornerOfReader = { x: number; y: number }

const START_OF_SPINE_ITEM: DistanceToCornerOfReader = { x: 0, y: 0 }

const isLessThanOnePixelApart = (
  a: DistanceToCornerOfReader,
  b: DistanceToCornerOfReader,
) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1

const isBetweenStartOfSpineItemAnd = (
  place: DistanceToCornerOfReader,
  distance: DistanceToCornerOfReader,
) =>
  distance.x > -1 &&
  distance.x < place.x + 1 &&
  distance.y > -1 &&
  distance.y < place.y + 1

/**
 * Expects every frame to show a place of a spine item that `isPlaceFrameCanShow`
 * accepts, before, while and after something moves that spine item in the
 * spine, and the reader to end on one that `isPlaceReaderCanEndOn` accepts.
 * A place is given as the distance from the spine item to the corner of the
 * reader. The reader shows the start of the spine item as this is called.
 * `moveSpineItemInSpine` resolves once the reader has laid out and its result
 * has settled on that layout.
 */
const expectEveryFrameToShowPlaceOfSpineItemWhile = async (
  page: Page,
  spineItemIndex: number,
  moveSpineItemInSpine: () => Promise<unknown>,
  {
    isPlaceFrameCanShow,
    isPlaceReaderCanEndOn,
  }: {
    isPlaceFrameCanShow: (distance: DistanceToCornerOfReader) => boolean
    isPlaceReaderCanEndOn: (distance: DistanceToCornerOfReader) => boolean
  },
) => {
  const placeBefore = await getPlaceOfSpineItem(page, spineItemIndex)

  expect(
    isLessThanOnePixelApart(
      placeBefore.distanceToCornerOfReader,
      START_OF_SPINE_ITEM,
    ),
    "whether the reader shows the start of the spine item, before it moves",
  ).toBe(true)

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
    distancesAtEachFrame.filter((distance) => !isPlaceFrameCanShow(distance)),
    "the distances from the spine item to the corner of the reader, at the frames that showed another place",
  ).toEqual([])
  expect(
    isPlaceReaderCanEndOn(placeAfter.distanceToCornerOfReader),
    `whether the reader ends on a place it can, at ${JSON.stringify(placeAfter.distanceToCornerOfReader)} from its corner`,
  ).toBe(true)

  return {
    distancesAtEachFrame,
    placeReaderEndsOn: placeAfter.distanceToCornerOfReader,
  }
}

const isStartOfSpineItem = (distance: DistanceToCornerOfReader) =>
  isLessThanOnePixelApart(distance, START_OF_SPINE_ITEM)

/**
 * Expects every frame to show the start of a spine item, before, while and
 * after something moves that spine item in the spine. The reader shows its
 * start as this is called. `moveSpineItemInSpine` resolves once the reader
 * has laid out and its result has settled on that layout.
 */
export const expectEveryFrameToShowStartOfSpineItemWhile = (
  page: Page,
  spineItemIndex: number,
  moveSpineItemInSpine: () => Promise<unknown>,
) =>
  expectEveryFrameToShowPlaceOfSpineItemWhile(
    page,
    spineItemIndex,
    moveSpineItemInSpine,
    {
      isPlaceFrameCanShow: isStartOfSpineItem,
      isPlaceReaderCanEndOn: isStartOfSpineItem,
    },
  )

/**
 * The same, while `moveSpineItemInSpine` also scrolls as the user does, to a
 * place of the spine item given as its distance to the corner of the reader:
 * a frame can show the start of the spine item or that place, and the reader
 * has to end on that place.
 *
 * With `canScrollStopOnItsWay`, a frame can show any place between the two,
 * and the reader can end on any of them. A browser can animate the scroll of
 * a wheel, and stop it where the reader scrolls the book.
 *
 * No frame shows a place the scroll had already passed: the reader does not
 * take the book back. Resolves with the place the reader ends on.
 */
export const expectEveryFrameToShowWhereUserScrollsInSpineItemWhile = async (
  page: Page,
  spineItemIndex: number,
  moveSpineItemInSpine: () => Promise<unknown>,
  {
    placeUserScrollsTo,
    canScrollStopOnItsWay,
  }: {
    placeUserScrollsTo: DistanceToCornerOfReader
    canScrollStopOnItsWay: boolean
  },
) => {
  const isPlaceScrollCanEndOn = (distance: DistanceToCornerOfReader) =>
    isLessThanOnePixelApart(distance, placeUserScrollsTo) ||
    (canScrollStopOnItsWay &&
      isBetweenStartOfSpineItemAnd(placeUserScrollsTo, distance))

  const { distancesAtEachFrame, placeReaderEndsOn } =
    await expectEveryFrameToShowPlaceOfSpineItemWhile(
      page,
      spineItemIndex,
      moveSpineItemInSpine,
      {
        isPlaceFrameCanShow: (distance) =>
          isStartOfSpineItem(distance) || isPlaceScrollCanEndOn(distance),
        isPlaceReaderCanEndOn: isPlaceScrollCanEndOn,
      },
    )

  expect(
    distancesAtEachFrame.filter(
      (distance, frameIndex) =>
        frameIndex > 0 &&
        distance.y <= (distancesAtEachFrame[frameIndex - 1]?.y ?? 0) - 1,
    ),
    "the distances from the spine item to the corner of the reader, at the frames that showed a place the scroll had already passed",
  ).toEqual([])

  return placeReaderEndsOn
}

/**
 * Goes to the start of a spine item while the ones before it that load with
 * it wait at the end of their load. Resolves to a function that lets them
 * finish, and resolves once the reader has laid out for them and its result
 * has settled.
 *
 * Given `duringUserScroll`, that function lets them finish once the
 * navigation is locked, as the user's scroll locks it from its first move:
 * the scroll is then still in progress as they finish. With
 * `scrollsDownFirstBy`, it first scrolls the book down by as much, as the
 * user does. Without it, the spec scrolls before the call.
 *
 * The reader lays out for a load once the user's scroll is over. With
 * `laysOutReaderOnceLoadsFinish`, the function asks for a layout of the
 * reader as soon as they finish. It asks in a task of its own, as a resize of
 * the reader's container does. That layout does not wait for the end of the
 * scroll, and lays out for them too.
 *
 * Either way it resolves with whether the navigation was locked as the loads
 * finished, and as the spine items were laid out.
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

  return async ({
    duringUserScroll,
  }: {
    duringUserScroll?: {
      scrollsDownFirstBy?: number
      laysOutReaderOnceLoadsFinish?: boolean
    }
  } = {}) => {
    const stateOfNavigationLock = await loadsHeld.evaluateHandle(
      ({ letLoadsFinish, haveAllLoaded }, { reader, duringUserScroll }) => {
        const stateOfNavigationLock: {
          wasNavigationLockedAsLoadsFinished?: boolean
          wasNavigationLockedAsSpineItemsWereLaidOut?: boolean
        } = {}
        const scrollElement =
          reader.navigation.scrollNavigationController.value.element

        const isNavigationLocked = () => {
          let isLockedNow = false

          // Replays whether the lock is held now.
          reader.navigation.isLocked$
            .subscribe((isLocked) => {
              isLockedNow = isLocked
            })
            .unsubscribe()

          return isLockedNow
        }

        if (duringUserScroll?.scrollsDownFirstBy !== undefined) {
          scrollElement?.scrollTo({
            top: scrollElement.scrollTop + duringUserScroll.scrollsDownFirstBy,
          })
        }

        // Replays whether the lock is held now, then follows it.
        const lockOfUserScroll = duringUserScroll
          ? reader.navigation.isLocked$.subscribe((isLocked) => {
              if (isLocked) letLoadsFinish()
            })
          : undefined
        const loadsFinishing =
          reader.spineItemsObserver.itemLoadStatusChange$.subscribe(() => {
            if (!haveAllLoaded()) return

            loadsFinishing.unsubscribe()
            lockOfUserScroll?.unsubscribe()
            stateOfNavigationLock.wasNavigationLockedAsLoadsFinished =
              isNavigationLocked()

            if (duringUserScroll?.laysOutReaderOnceLoadsFinish) {
              setTimeout(() => {
                reader.layout()
              })
            }
          })
        const itemsLayout = reader.spine.itemsLayout$.subscribe(() => {
          itemsLayout.unsubscribe()
          stateOfNavigationLock.wasNavigationLockedAsSpineItemsWereLaidOut =
            isNavigationLocked()
        })

        if (!duringUserScroll) letLoadsFinish()

        return stateOfNavigationLock
      },
      { reader, duringUserScroll },
    )

    /**
     * Nothing from before the loads satisfies this: a load that ends asks
     * for a layout in the same task.
     */
    await page.waitForFunction(
      ({ reader, loadsHeld }) =>
        loadsHeld.haveAllLoaded() &&
        reader.spine.isLayoutCurrent() &&
        reader.pagination.state.isSettled,
      { reader, loadsHeld },
    )

    return stateOfNavigationLock.jsonValue()
  }
}

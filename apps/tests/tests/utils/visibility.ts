import { expect, type Page } from "@playwright/test"
import { getReader } from "./reader"

/** An element's box as the page renders it, and the window it is drawn in. */
type BoxInWindow = {
  box: { top: number; right: number; bottom: number; left: number }
  window: { width: number; height: number }
}

/** Whether any of a box is inside the window: one touching its edge is not. */
const isBoxOnScreen = ({ box, window }: BoxInWindow) =>
  box.bottom > 0 &&
  box.top < window.height &&
  box.right > 0 &&
  box.left < window.width

/**
 * Each spine item's load status, and whether any of its container is on
 * screen as the page renders it: what a zoom, a scroll or any other transform
 * shows. With them, whether the layout is current: until it is, a pending
 * layout can still move the containers. All are read in one go, so they
 * describe the same moment.
 */
export const getSpineItemsOnScreen = async (page: Page) => {
  const { isLayoutCurrent, spineItems } = await (
    await getReader(page)
  ).evaluate((reader) => ({
    isLayoutCurrent: reader.spine.isLayoutCurrent(),
    spineItems: reader.spineItemsManager.items.map((spineItem) => {
      const { top, right, bottom, left } =
        spineItem.containerElement.getBoundingClientRect()

      return {
        index: spineItem.index,
        loadStatus: spineItem.value.loadStatus,
        box: { top, right, bottom, left },
        window: { width: window.innerWidth, height: window.innerHeight },
      }
    }),
  }))

  return {
    isLayoutCurrent,
    spineItems: spineItems.map(({ index, loadStatus, ...boxInWindow }) => ({
      index,
      loadStatus,
      isOnScreen: isBoxOnScreen(boxInWindow),
    })),
  }
}

/** The indexes of the spine items any of whose container is on screen. */
export const getSpineItemIndexesOnScreen = async (page: Page) =>
  (await getSpineItemsOnScreen(page)).spineItems
    .filter(({ isOnScreen }) => isOnScreen)
    .map(({ index }) => index)

/**
 * Waits until the spine items whose document is loaded are exactly the ones on
 * screen, with none loading or unloading and the layout current: what a reader
 * that preloads none around them ends on. A failure names the spine items on
 * screen but not loaded, and the ones loaded off screen.
 */
export const expectLoadedSpineItemsToBeTheOnesOnScreen = async (page: Page) => {
  await expect
    .poll(async () => {
      const { isLayoutCurrent, spineItems } = await getSpineItemsOnScreen(page)
      const indexesWhere = (
        isMatching: (spineItem: (typeof spineItems)[number]) => boolean,
      ) => spineItems.filter(isMatching).map(({ index }) => index)

      return {
        onScreenButNotLoaded: indexesWhere(
          ({ isOnScreen, loadStatus }) => isOnScreen && loadStatus !== "loaded",
        ),
        loadedButOffScreen: indexesWhere(
          ({ isOnScreen, loadStatus }) =>
            !isOnScreen && loadStatus === "loaded",
        ),
        loadingOrUnloading: indexesWhere(
          ({ loadStatus }) =>
            loadStatus === "loading" || loadStatus === "unloading",
        ),
        isLayoutCurrent,
      }
    })
    .toEqual({
      onScreenButNotLoaded: [],
      loadedButOffScreen: [],
      loadingOrUnloading: [],
      isLayoutCurrent: true,
    })
}

/**
 * Records from now on each spine item that starts unloading while any of its
 * container is on screen: a chapter the reader blanks in view. Resolves to a
 * function that gives their indexes so far, in order.
 */
export const recordSpineItemsUnloadedOnScreen = async (page: Page) => {
  const unloadsRecordedInPage = await (await getReader(page)).evaluateHandle(
    (reader) => {
      const unloads: ({ index: number } & BoxInWindow)[] = []

      reader.spineItemsObserver.itemLoadStatusChange$.subscribe(
        ({ item, loadStatus }) => {
          if (loadStatus !== "unloading") return

          const { top, right, bottom, left } =
            item.containerElement.getBoundingClientRect()

          unloads.push({
            index: item.index,
            box: { top, right, bottom, left },
            window: { width: window.innerWidth, height: window.innerHeight },
          })
        },
      )

      return unloads
    },
  )

  return async () =>
    (await unloadsRecordedInPage.jsonValue())
      .filter((unload) => isBoxOnScreen(unload))
      .map(({ index }) => index)
}

/**
 * Whether the exact position a cfi points to is inside the window, so a
 * restored page is judged by where the anchored character ended up rather
 * than by whichever element happens to contain it.
 */
export const isCfiPositionVisible = async (page: Page, cfi: string) =>
  (await getReader(page)).evaluate((reader, cfi) => {
    const { node, offset } = reader.cfi.resolveCfi({ cfi })

    if (!node) return "cfi did not resolve to a node"

    const frame = node.ownerDocument?.defaultView?.frameElement

    if (!frame || !node.ownerDocument) return "node is not inside a frame"

    const range = node.ownerDocument.createRange()

    if (node.nodeType === Node.TEXT_NODE) {
      const start = Math.min(offset ?? 0, node.textContent?.length ?? 0)
      range.setStart(node, start)
      range.setEnd(node, Math.min(start + 1, node.textContent?.length ?? 0))
    } else {
      range.selectNodeContents(node)
    }

    const rect = range.getBoundingClientRect()
    const frameRect = frame.getBoundingClientRect()
    const x = frameRect.left + rect.left
    const y = frameRect.top + rect.top

    return x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight
  }, cfi)

/** Whether the start of an element of a spine item is inside the window. */
export const isElementStartOnScreen = async (
  page: Page,
  spineItemIndex: number,
  id: string,
) =>
  (await getReader(page)).evaluate(
    (reader, { spineItemIndex, id }) => {
      const spineItem = reader.spineItemsManager.get(spineItemIndex)
      const element = spineItem?.loadedDocument?.getElementById(id)
      const frame = spineItem?.renderer.getDocumentFrame()

      if (!frame || !element) return `no #${id} in a loaded document`

      const rect = element.getBoundingClientRect()
      const frameRect = frame.getBoundingClientRect()
      const x = frameRect.left + rect.left
      const y = frameRect.top + rect.top

      return x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight
    },
    { spineItemIndex, id },
  )

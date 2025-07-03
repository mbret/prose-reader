import type { Context } from "../../context/Context"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpinePosition } from "../../spine/types"
import type { SpineItem } from "../../spineItem/SpineItem"
import { SpineItemPosition } from "../../spineItem/types"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"

const getNodeFromSelector = (
  selector: string,
  frameElement?: HTMLIFrameElement,
) => {
  if (frameElement && frameElement instanceof HTMLIFrameElement) {
    if (selector.startsWith(`#`)) {
      return frameElement.contentDocument?.getElementById(
        selector.replace(`#`, ``),
      )
    }

    return frameElement.contentDocument?.querySelector(selector)
  }
}

/**
 * @todo vertical, should returns spine position or something anyway
 */
const getSpineItemOffsetFromAnchor = ({
  anchor,
  spineItem,
  spine,
}: {
  anchor: string
  spineItem: SpineItem
  spine: Spine
}) => {
  const node = getNodeFromSelector(
    anchor,
    spineItem.renderer.getDocumentFrame(),
  )

  if (!node) {
    return 0
  }

  return (
    spine.spineItemLocator.getSpineItemPositionFromNode(node, 0, spineItem)
      ?.x ?? 0
  )
}

const getSpinePositionFromSpineItemAnchor = ({
  anchor,
  spineItem,
  spineLocator,
  spine,
}: {
  anchor: string
  spineItem: SpineItem
  spineLocator: SpineLocator
  spine: Spine
}) => {
  const spineItemOffset = getSpineItemOffsetFromAnchor({
    anchor,
    spineItem,
    spine,
  })

  const position = spineLocator.getSpinePositionFromSpineItemPosition({
    spineItemPosition: new SpineItemPosition({ x: spineItemOffset, y: 0 }),
    spineItem,
  })

  return position
}

const getNavigationForAnchor = ({
  anchor,
  spineItem,
  spineLocator,
  spine,
  pageSizeWidth,
  visibleAreaRectWidth,
}: {
  anchor: string
  spineItem: SpineItem
  spineLocator: SpineLocator
  spine: Spine
  pageSizeWidth: number
  visibleAreaRectWidth: number
}) => {
  const position = getSpinePositionFromSpineItemAnchor({
    anchor,
    spineItem,
    spineLocator,
    spine,
  })

  return getAdjustedPositionForSpread({
    position,
    pageSizeWidth,
    visibleAreaRectWidth,
  })
}

/**
 * @todo should be part of enhancer, all the core needs to know to restore navigation
 * is a spine item id AND a node ID.
 */
export const getNavigationForUrl = ({
  spine,
  spineItemsManager,
  spineLocator,
  url,
  context,
  pageSizeWidth,
  visibleAreaRectWidth,
}: {
  url: string | URL
  spineItemsManager: SpineItemsManager
  spineLocator: SpineLocator
  context: Context
  spine: Spine
  pageSizeWidth: number
  visibleAreaRectWidth: number
}): { position: SpinePosition; spineItemId: string } | undefined => {
  try {
    const validUrl = url instanceof URL ? url : new URL(url)
    const urlWithoutAnchor = `${validUrl.origin}${validUrl.pathname}`
    const existingSpineItem = context.manifest?.spineItems.find(
      (item) => item.href === urlWithoutAnchor,
    )

    if (existingSpineItem) {
      const spineItem = spineItemsManager.get(existingSpineItem.id)

      if (spineItem) {
        const position = getNavigationForAnchor({
          anchor: validUrl.hash,
          spineItem,
          spine,
          spineLocator,
          pageSizeWidth,
          visibleAreaRectWidth,
        })

        return {
          position: getAdjustedPositionForSpread({
            position,
            pageSizeWidth,
            visibleAreaRectWidth,
          }),
          spineItemId: existingSpineItem.id,
        }
      }
    }

    return undefined
  } catch (e) {
    console.error(e)

    return undefined
  }
}

import { resolveCfi } from "../../cfi"
import type { Context } from "../../context/Context"
import { Report } from "../../report"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition, type UnboundSpinePosition } from "../../spine/types"
import { createNavigationResolver as createSpineItemNavigator } from "../../spineItem/navigationResolver"
import type { SpineItem } from "../../spineItem/SpineItem"
import { SpineItemPosition } from "../../spineItem/types"
import type { Viewport } from "../../viewport/Viewport"
import { fromOutOfBoundsSpinePosition } from "./fromOutOfBoundsSpinePosition"
import { fromUnboundSpinePosition } from "./fromUnboundSpinePosition"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"
import { getNavigationForPosition } from "./getNavigationForPosition"
import { getNavigationForSpineItemPage } from "./getNavigationForSpineItemPage"
import { getNavigationForUrl } from "./getNavigationForUrl"
import { getNavigationFromSpineItemPosition } from "./getNavigationFromSpineItemPosition"

export const NAMESPACE = `spineNavigator`

export type NavigationResolver = ReturnType<typeof createNavigationResolver>

export const createNavigationResolver = ({
  context,
  spineItemsManager,
  locator,
  settings,
  spine,
  viewport,
}: {
  context: Context
  spineItemsManager: SpineItemsManager
  locator: SpineLocator
  settings: ReaderSettingsManager
  spine: Spine
  viewport: Viewport
}) => {
  const spineItemNavigator = createSpineItemNavigator({
    context,
    settings,
    viewport,
  })

  const arePositionsDifferent = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => a.x !== b.x || a.y !== b.y

  const getNavigationForCfi = (cfi: string): SpinePosition | undefined => {
    const spineItem = spineItemsManager.getSpineItemFromCfi(cfi)
    const { node, offset = 0 } = resolveCfi({
      cfi,
      spineItemsManager,
    })

    if (!spineItem) {
      Report.warn(NAMESPACE, `unable to detect item id from cfi ${cfi}`)

      return undefined
    }

    const spineItemNavigation = node
      ? spineItemNavigator.getNavigationFromNode(spineItem, node, offset)
      : new SpineItemPosition({ x: 0, y: 0 })
    const readingPosition = locator.getSpinePositionFromSpineItemPosition({
      spineItemPosition: spineItemNavigation,
      spineItem,
    })

    return getAdjustedPositionForSpread({
      position: readingPosition,
      pageSizeWidth: viewport.pageSize.width,
      visibleAreaRectWidth: viewport.absoluteViewport.width,
    })
  }

  const getNavigationForLastPage = (spineItem: SpineItem): SpinePosition => {
    const spineItemNavigation =
      spineItemNavigator.getNavigationForLastPage(spineItem)
    const position = locator.getSpinePositionFromSpineItemPosition({
      spineItemPosition: spineItemNavigation,
      spineItem,
    })

    return getAdjustedPositionForSpread({
      position,
      pageSizeWidth: viewport.pageSize.width,
      visibleAreaRectWidth: viewport.absoluteViewport.width,
    })
  }

  const getNavigationForSpineIndexOrId = (
    indexOrId: number | string | SpineItem,
  ): SpinePosition => {
    const spineItem = spineItemsManager.get(indexOrId)

    if (spineItem) {
      const position = locator.getSpinePositionFromSpineItem(spineItem)

      return getAdjustedPositionForSpread({
        position,
        pageSizeWidth: viewport.pageSize.width,
        visibleAreaRectWidth: viewport.absoluteViewport.width,
      })
    }

    return new SpinePosition({ x: 0, y: 0 })
  }

  /**
   * Useful when you want to get a navigation from a scroll position. It uses trigger points so it will
   * try to get the most visible / relevant element as navigation reference
   */
  const getMostPredominantNavigationForPosition = (
    viewportPosition: SpinePosition,
  ): SpinePosition => {
    const pageTurnDirection = settings.values.computedPageTurnDirection
    // @todo movingForward does not work same with free-scroll, try to find a reliable way to detect
    // const movingForward = navigator.isNavigationGoingForwardFrom(navigation, currentNavigationPosition)
    // const triggerPercentage = movingForward ? 0.7 : 0.3
    const triggerPercentage = 0.5
    const triggerXPosition =
      pageTurnDirection === `horizontal`
        ? viewportPosition.x +
          viewport.absoluteViewport.width * triggerPercentage
        : 0
    const triggerYPosition =
      pageTurnDirection === `horizontal`
        ? 0
        : viewportPosition.y +
          viewport.absoluteViewport.height * triggerPercentage
    const midScreenPositionSafePosition = fromUnboundSpinePosition({
      position: new SpinePosition({
        x: triggerXPosition,
        y: triggerYPosition,
      }),
      isRTL: context.isRTL(),
      pageSizeHeight: viewport.pageSize.height,
      visibleAreaRectWidth: viewport.absoluteViewport.width,
      spineItemsManager,
      spine,
    })

    return getNavigationForPosition({
      spineItemNavigationResolver: spineItemNavigator,
      spineLocator: locator,
      viewportPosition: midScreenPositionSafePosition,
      viewport,
    })
  }

  const isNavigationGoingForwardFrom = (
    to: SpinePosition,
    from: SpinePosition,
  ) => {
    const pageTurnDirection = settings.values.computedPageTurnDirection

    if (pageTurnDirection === `vertical`) {
      return to.y > from.y
    }

    return to.x > from.x
  }

  return {
    getNavigationForUrl: (url: string | URL) =>
      getNavigationForUrl({
        context,
        spineItemsManager,
        spineLocator: locator,
        url,
        pageSizeWidth: viewport.pageSize.width,
        visibleAreaRectWidth: viewport.absoluteViewport.width,
        spine,
      }),
    getNavigationForSpineItemPage: (
      params: Omit<
        Parameters<typeof getNavigationForSpineItemPage>[0],
        | "spineItemsManager"
        | "spineItemNavigationResolver"
        | "spineLocator"
        | "viewport"
      >,
    ) =>
      getNavigationForSpineItemPage({
        ...params,
        spineItemsManager,
        spineItemNavigationResolver: spineItemNavigator,
        spineLocator: locator,
        viewport,
      }),
    getNavigationFromSpineItemPosition: (params: {
      spineItemPosition: SpineItemPosition
      spineItem: SpineItem
    }) =>
      getNavigationFromSpineItemPosition({
        ...params,
        spineItemLocator: locator.spineItemLocator,
        spineLocator: locator,
        viewport,
      }),
    getNavigationForCfi,
    getNavigationForLastPage,
    getNavigationForSpineIndexOrId,
    getNavigationForPosition: (
      viewportPosition: SpinePosition | UnboundSpinePosition,
    ) =>
      getNavigationForPosition({
        viewportPosition,
        spineItemNavigationResolver: spineItemNavigator,
        spineLocator: locator,
        viewport,
      }),
    getMostPredominantNavigationForPosition,
    fromUnboundSpinePosition: (
      position: SpinePosition | UnboundSpinePosition,
    ) =>
      fromUnboundSpinePosition({
        position,
        isRTL: context.isRTL(),
        pageSizeHeight: viewport.pageSize.height,
        visibleAreaRectWidth: viewport.absoluteViewport.width,
        spineItemsManager,
        spine,
      }),
    fromOutOfBoundsSpinePosition: (
      position: SpinePosition | UnboundSpinePosition,
    ) =>
      fromOutOfBoundsSpinePosition({
        position,
        isRTL: context.isRTL(),
        spineItemsManager,
        spine,
        viewportWidth: viewport.absoluteViewport.width,
      }),
    isNavigationGoingForwardFrom,
    arePositionsDifferent,
    getAdjustedPositionForSpread: (
      position: SpinePosition | UnboundSpinePosition,
    ) =>
      getAdjustedPositionForSpread({
        position,
        pageSizeWidth: viewport.pageSize.width,
        visibleAreaRectWidth: viewport.absoluteViewport.width,
      }),
    spineItemNavigator,
  }
}

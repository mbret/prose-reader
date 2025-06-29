import { resolveCfi } from "../../cfi"
import type { Context } from "../../context/Context"
import { Report } from "../../report"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import { SpinePosition } from "../../spine/types"
import type { SpineItem } from "../../spineItem/SpineItem"
import { createNavigationResolver as createSpineItemNavigator } from "../../spineItem/navigationResolver"
import { SpineItemPosition } from "../../spineItem/types"
import type { DeprecatedViewportPosition } from "../types"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"
import { getAdjustedPositionWithSafeEdge } from "./getAdjustedPositionWithSafeEdge"
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
}: {
  context: Context
  spineItemsManager: SpineItemsManager
  locator: SpineLocator
  settings: ReaderSettingsManager
  spine: Spine
}) => {
  const spineItemNavigator = createSpineItemNavigator({ context, settings })

  const arePositionsDifferent = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => a.x !== b.x || a.y !== b.y

  const getNavigationForCfi = (
    cfi: string,
  ): DeprecatedViewportPosition | undefined => {
    const spineItem = spineItemsManager.getSpineItemFromCfi(cfi)
    const { node, offset = 0 } =
      resolveCfi({
        cfi,
        spineItemsManager,
      }) || {}

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
      pageSizeWidth: context.getPageSize().width,
      visibleAreaRectWidth: context.state.visibleAreaRect.width,
    })
  }

  const getNavigationForLastPage = (
    spineItem: SpineItem,
  ): DeprecatedViewportPosition => {
    const spineItemNavigation =
      spineItemNavigator.getNavigationForLastPage(spineItem)
    const position = locator.getSpinePositionFromSpineItemPosition({
      spineItemPosition: spineItemNavigation,
      spineItem,
    })

    return getAdjustedPositionForSpread({
      position,
      pageSizeWidth: context.getPageSize().width,
      visibleAreaRectWidth: context.state.visibleAreaRect.width,
    })
  }

  const getNavigationForSpineIndexOrId = (
    indexOrId: number | string | SpineItem,
  ): DeprecatedViewportPosition => {
    const spineItem = spineItemsManager.get(indexOrId)

    if (spineItem) {
      const position = locator.getSpinePositionFromSpineItem(spineItem)

      return getAdjustedPositionForSpread({
        position,
        pageSizeWidth: context.getPageSize().width,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
      })
    }

    return new SpinePosition({ x: 0, y: 0 })
  }

  /**
   * Useful when you want to get a navigation from a scroll position. It uses trigger points so it will
   * try to get the most visible / relevant element as navigation reference
   */
  const getMostPredominantNavigationForPosition = (
    viewportPosition: DeprecatedViewportPosition,
  ): DeprecatedViewportPosition => {
    const pageTurnDirection = settings.values.computedPageTurnDirection
    // @todo movingForward does not work same with free-scroll, try to find a reliable way to detect
    // const movingForward = navigator.isNavigationGoingForwardFrom(navigation, currentNavigationPosition)
    // const triggerPercentage = movingForward ? 0.7 : 0.3
    const triggerPercentage = 0.5
    const triggerXPosition =
      pageTurnDirection === `horizontal`
        ? viewportPosition.x +
          context.state.visibleAreaRect.width * triggerPercentage
        : 0
    const triggerYPosition =
      pageTurnDirection === `horizontal`
        ? 0
        : viewportPosition.y +
          context.state.visibleAreaRect.height * triggerPercentage
    const midScreenPositionSafePosition = getAdjustedPositionWithSafeEdge({
      position: new SpinePosition({
        x: triggerXPosition,
        y: triggerYPosition,
      }),
      isRTL: context.isRTL(),
      pageSizeHeight: context.getPageSize().height,
      visibleAreaRectWidth: context.state.visibleAreaRect.width,
      spineItemsManager,
      spine,
    })

    return getNavigationForPosition({
      context,
      spineItemNavigationResolver: spineItemNavigator,
      spineLocator: locator,
      viewportPosition: midScreenPositionSafePosition,
    })
  }

  const isNavigationGoingForwardFrom = (
    to: DeprecatedViewportPosition,
    from: DeprecatedViewportPosition,
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
        pageSizeWidth: context.getPageSize().width,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
      }),
    getNavigationForSpineItemPage: (
      params: Omit<
        Parameters<typeof getNavigationForSpineItemPage>[0],
        | "context"
        | "spineItemsManager"
        | "spineItemNavigationResolver"
        | "spineLocator"
      >,
    ) =>
      getNavigationForSpineItemPage({
        ...params,
        context,
        spineItemsManager,
        spineItemNavigationResolver: spineItemNavigator,
        spineLocator: locator,
      }),
    getNavigationFromSpineItemPosition: (params: {
      spineItemPosition: SpineItemPosition
      spineItem: SpineItem
    }) =>
      getNavigationFromSpineItemPosition({
        ...params,
        spineItemLocator: locator.spineItemLocator,
        spineLocator: locator,
        context,
      }),
    getNavigationForCfi,
    getNavigationForLastPage,
    getNavigationForSpineIndexOrId,
    getNavigationForPosition: (
      viewportPosition: DeprecatedViewportPosition | SpinePosition,
    ) =>
      getNavigationForPosition({
        viewportPosition,
        context,
        spineItemNavigationResolver: spineItemNavigator,
        spineLocator: locator,
      }),
    getMostPredominantNavigationForPosition,
    getAdjustedPositionWithSafeEdge: (
      position: DeprecatedViewportPosition | SpinePosition,
    ) =>
      getAdjustedPositionWithSafeEdge({
        position,
        isRTL: context.isRTL(),
        pageSizeHeight: context.getPageSize().height,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
        spineItemsManager,
        spine,
      }),
    isNavigationGoingForwardFrom,
    arePositionsDifferent,
    getAdjustedPositionForSpread: (
      position: DeprecatedViewportPosition | SpinePosition,
    ) =>
      getAdjustedPositionForSpread({
        position,
        pageSizeWidth: context.getPageSize().width,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
      }),
    spineItemNavigator,
  }
}

import { Report } from "../../report"
import type { Context } from "../../context/Context"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { createNavigationResolver as createSpineItemNavigator } from "../../spineItem/navigationResolver"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { ViewportPosition } from "../viewport/ViewportNavigator"
import type {
  SafeSpineItemPosition,
  UnsafeSpineItemPosition,
} from "../../spineItem/types"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"
import { getAdjustedPositionWithSafeEdge } from "./getAdjustedPositionWithSafeEdge"
import { getNavigationForUrl } from "./getNavigationForUrl"
import { getNavigationFromSpineItemPosition } from "./getNavigationFromSpineItemPosition"
import { getNavigationForSpineItemPage } from "./getNavigationForSpineItemPage"
import { getNavigationForPosition } from "./getNavigationForPosition"
import { resolveCfi } from "../../cfi/lookup/resolveCfi"
import type { SpineLayout } from "../../spine/SpineLayout"
import type { SpineItem } from "../../spineItem/SpineItem"

export const NAMESPACE = `spineNavigator`

export type NavigationResolver = ReturnType<typeof createNavigationResolver>

export const createNavigationResolver = ({
  context,
  spineItemsManager,
  locator,
  settings,
  spineLayout,
}: {
  context: Context
  spineItemsManager: SpineItemsManager
  locator: SpineLocator
  settings: ReaderSettingsManager
  spineLayout: SpineLayout
}) => {
  const spineItemNavigator = createSpineItemNavigator({ context, settings })

  const arePositionsDifferent = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => a.x !== b.x || a.y !== b.y

  const areNavigationDifferent = (a: ViewportPosition, b: ViewportPosition) =>
    arePositionsDifferent(a, b) ||
    (!!a.spineItem && !!b.spineItem && a.spineItem !== b.spineItem)

  const getNavigationForCfi = (cfi: string): ViewportPosition | undefined => {
    const spineItem = spineItemsManager.getSpineItemFromCfi(cfi)
    const { node, offset = 0 } =
      resolveCfi({
        cfi,
        spineItemsManager,
      }) || {}

    if (!spineItem) {
      Report.warn(NAMESPACE, `unable to detect item id from cfi ${cfi}`)
    } else {
      const spineItemNavigation = node
        ? spineItemNavigator.getNavigationFromNode(spineItem, node, offset)
        : ({ x: 0, y: 0 } as SafeSpineItemPosition)
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

    return undefined
  }

  const getNavigationForLastPage = (spineItem: SpineItem): ViewportPosition => {
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
  ): ViewportPosition => {
    const spineItem = spineItemsManager.get(indexOrId)

    if (spineItem) {
      const position = locator.getSpinePositionFromSpineItem(spineItem)

      return getAdjustedPositionForSpread({
        position,
        pageSizeWidth: context.getPageSize().width,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
      })
    }

    return { x: 0, y: 0 }
  }

  /**
   * Useful when you want to get a navigation from a scroll position. It uses trigger points so it will
   * try to get the most visible / relevant element as navigation reference
   */
  const getMostPredominantNavigationForPosition = (
    viewportPosition: ViewportPosition,
  ): ViewportPosition => {
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
      position: {
        x: triggerXPosition,
        y: triggerYPosition,
      },
      isRTL: context.isRTL(),
      pageSizeHeight: context.getPageSize().height,
      visibleAreaRectWidth: context.state.visibleAreaRect.width,
      spineItemsManager,
      spineLayout,
    })

    return getNavigationForPosition({
      context,
      spineItemNavigationResolver: spineItemNavigator,
      spineLocator: locator,
      viewportPosition: midScreenPositionSafePosition,
    })
  }

  const isNavigationGoingForwardFrom = (
    to: ViewportPosition,
    from: ViewportPosition,
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
      spineItemPosition: UnsafeSpineItemPosition
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
    getNavigationForPosition: (viewportPosition: ViewportPosition) =>
      getNavigationForPosition({
        viewportPosition,
        context,
        spineItemNavigationResolver: spineItemNavigator,
        spineLocator: locator,
      }),
    getMostPredominantNavigationForPosition,
    getAdjustedPositionWithSafeEdge: (position: ViewportPosition) =>
      getAdjustedPositionWithSafeEdge({
        position,
        isRTL: context.isRTL(),
        pageSizeHeight: context.getPageSize().height,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
        spineItemsManager,
        spineLayout,
      }),
    isNavigationGoingForwardFrom,
    areNavigationDifferent,
    arePositionsDifferent,
    getAdjustedPositionForSpread: (position: ViewportPosition) =>
      getAdjustedPositionForSpread({
        position,
        pageSizeWidth: context.getPageSize().width,
        visibleAreaRectWidth: context.state.visibleAreaRect.width,
      }),
    spineItemNavigator,
  }
}

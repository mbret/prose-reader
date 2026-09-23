import type {
  DomPosition,
  PositionTarget,
} from "@prose-reader/shared/positions"
import type { CfiManager } from "../../cfi"
import type { Context } from "../../context/Context"
import { createPositionRegistry } from "../../positions/createPositionRegistry"
import type { PositionRegistry } from "../../positions/PositionRegistry"
import { Report } from "../../report"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition, type UnboundSpinePosition } from "../../spine/types"
import { createNavigationResolver as createSpineItemNavigator } from "../../spineItem/navigationResolver"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { SpineItemPosition } from "../../spineItem/types"
import type { Viewport } from "../../viewport/Viewport"
import type { NavigationVisibleArea } from "../types"
import { clampRectInSpine, getBoundaryForRectInSpine } from "./clampRectInSpine"
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
  cfi: cfiManager,
  positions = createPositionRegistry(context.manifest, cfiManager),
}: {
  positions?: PositionRegistry
  cfi: CfiManager
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

  const getNavigationForDomPosition = (
    spineItem: SpineItem,
    position: DomPosition,
  ): SpinePosition => {
    const spineItemPosition = spineItemNavigator.getNavigationFromNode(
      spineItem,
      position.node,
      position.offset ?? 0,
    )
    return getAdjustedPositionForSpread({
      position: locator.getSpinePositionFromSpineItemPosition({
        spineItemPosition,
        spineItem,
      }),
      pageSizeWidth: viewport.pageSize.width,
      visibleAreaRectWidth: viewport.absoluteViewport.width,
    })
  }

  const getNavigationForCfi = (value: string): SpinePosition | undefined => {
    const spineItem = cfiManager.getSpineItemFromCfi(value)
    const document = spineItem?.renderer.getDocumentFrame()?.contentDocument
    if (!spineItem?.value.isReady || !document) return undefined
    const position = positions
      .get("cfi")
      ?.resolve(value, { spineItem: spineItem.item, document })
    return position
      ? getNavigationForDomPosition(spineItem, position)
      : undefined
  }

  const getNavigationForTarget = (
    target: PositionTarget,
  ): {
    position: SpinePosition
    spineItem: number
    target: PositionTarget | undefined
    cfi: string | undefined
  } => {
    const format = positions.get(target.format)
    const index = format?.spineItemIndexOf(target.value)
    const spineItem =
      index === undefined ? undefined : spineItemsManager.get(index)
    if (!format || !spineItem) {
      Report.warn(
        NAMESPACE,
        `Unknown position format or invalid target: ${target.format}`,
      )
      return {
        spineItem: 0,
        position: getNavigationForSpineIndexOrId(0),
        target: undefined,
        cfi: undefined,
      }
    }
    const start = getNavigationForSpineIndexOrId(spineItem)
    // CFI already is canonical, including virtual-spine values handled by the hooks.
    if (target.format === "cfi") {
      return {
        spineItem: spineItem.index,
        position: getNavigationForCfi(target.value) ?? start,
        cfi: target.value,
        target: undefined,
      }
    }
    const document = spineItem.renderer.getDocumentFrame()?.contentDocument
    if (!spineItem.value.isReady) {
      return {
        spineItem: spineItem.index,
        position: start,
        target,
        cfi: undefined,
      }
    }
    const domPosition = document
      ? format.resolve(target.value, { spineItem: spineItem.item, document })
      : undefined
    return {
      spineItem: spineItem.index,
      position: domPosition
        ? getNavigationForDomPosition(spineItem, domPosition)
        : start,
      cfi: domPosition
        ? cfiManager.generateCfiFromDomPosition(domPosition, spineItem.item)
        : cfiManager.generateRootCfi(spineItem.item),
      target: undefined,
    }
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
    const midScreenPositionSafePosition = clampRectInSpine({
      position: new SpinePosition({
        x: triggerXPosition,
        y: triggerYPosition,
      }),
      size: viewport.absoluteViewport,
      isRTL: context.isRTL(),
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
    getNavigationForTarget,
    getNavigationForDomPosition,
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
    clampPositionInSpine: (
      position: SpinePosition | UnboundSpinePosition,
      size: NavigationVisibleArea,
    ) =>
      clampRectInSpine({
        position,
        size,
        isRTL: context.isRTL(),
        spineItemsManager,
        spine,
      }),
    getBoundaryForPosition: (
      position: SpinePosition | UnboundSpinePosition,
      size: NavigationVisibleArea = viewport.absoluteViewport,
    ) =>
      getBoundaryForRectInSpine({
        position,
        size,
        isRTL: context.isRTL(),
        spineItemsManager,
        spine,
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

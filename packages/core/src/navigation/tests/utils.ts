import { of } from "rxjs"
import { vi } from "vitest"
import { SpineItem } from "../.."
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { Pagination } from "../../pagination/Pagination"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { Spine } from "../../spine/Spine"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { createSpineLocator } from "../../spine/locator/SpineLocator"
import { SpineItemSpineLayout } from "../../spine/types"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { noopElement } from "../../utils/dom"
import { Viewport } from "../../viewport/Viewport"
import { InternalNavigator } from "../InternalNavigator"
import { Locker } from "../Locker"
import { UserScrollNavigation } from "../UserScrollNavigation"
import { ControlledNavigationController } from "../controllers/ControlledNavigationController"
import { ScrollNavigationController } from "../controllers/ScrollNavigationController"
import { createNavigationResolver } from "../resolvers/NavigationResolver"

const createSpineItem = (
  item: {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  },
  context: Context,
  index: number,
  settings: ReaderSettingsManager,
  hookManager: HookManager,
) => {
  const containerElement = document.createElement("div")

  const spineItem = new SpineItem(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    {} as any,
    containerElement,
    context,
    settings,
    hookManager,
    index,
  )

  vi.spyOn(spineItem.layout, "layoutInfo", "get").mockReturnValue({
    // left: item.left,
    // top: item.top,
    width: item.width,
    height: item.height,
    // right: item.right,
    // bottom: item.bottom,
    // x: item.left,
    // y: item.top,
  })

  return spineItem
}

export const generateItems = (
  size: number,
  number: number,
  context: Context,
  settings: ReaderSettingsManager,
  hookManager: HookManager,
  spine: Spine,
  spineItemsManager: SpineItemsManager,
) => {
  const layoutInfos: SpineItemSpineLayout[] = Array.from(Array(number)).map(
    (_, index) =>
      new SpineItemSpineLayout({
        left: index * size,
        top: 0,
        right: (index + 1) * size,
        bottom: size,
        width: size,
        height: size,
        x: index * size,
        y: 0,
      }),
  )

  const items = Array.from(Array(number)).map((_, index) =>
    createSpineItem(
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      layoutInfos[index]!,
      context,
      index,
      settings,
      hookManager,
    ),
  )

  vi.spyOn(spine.spineLayout, "getSpineItemSpineLayoutInfo").mockImplementation(
    (item) => {
      const itemIndex = spineItemsManager.getSpineItemIndex(item) ?? 0

      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      return layoutInfos[itemIndex]!
    },
  )

  return items
}

export const createNavigator = () => {
  const context = new Context()
  const settings = new ReaderSettingsManager({}, context)
  const spineItemsManager = new SpineItemsManager(context, settings)
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const pagination = new Pagination(context, spineItemsManager as any)
  const spineItemLocator = createSpineItemLocator({ context, settings })
  const hookManager = new HookManager()
  const viewport = new Viewport(context)
  const spine = new Spine(
    of(noopElement()),
    context,
    pagination,
    spineItemsManager,
    spineItemLocator,
    settings,
    hookManager,
    viewport,
  )
  const spineLocator = createSpineLocator({
    context,
    settings,
    spineItemLocator,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    spineItemsManager: spineItemsManager as any,
    spineLayout: spine.spineLayout,
    viewport,
  })
  const navigationResolver = createNavigationResolver({
    context,
    locator: spineLocator,
    settings,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    spineItemsManager: spineItemsManager as any,
    spineLayout: spine.spineLayout,
  })
  const viewportController = new ControlledNavigationController(
    settings,
    hookManager,
    context,
    spine,
    viewport,
  )

  const locker = new Locker()

  const scrollNavigationController = new ScrollNavigationController(
    viewport,
    settings,
    hookManager,
    spine,
    context,
  )

  const userNavigator = new UserScrollNavigation(
    settings,
    context,
    spine,
    scrollNavigationController,
    locker,
  )

  const internalNavigator = new InternalNavigator(
    settings,
    context,
    userNavigator.navigation$,
    viewportController,
    scrollNavigationController,
    navigationResolver,
    spine,
    locker.isLocked$,
  )

  return {
    internalNavigator,
    userNavigator,
    context,
    spineItemsManagerMock: spineItemsManager,
    spine,
    settings,
    hookManager,
  }
}

import { Reader } from "../../../reader"
import { Report } from "../../../report"
import { ViewportPosition } from "../../../navigation/viewport/ViewportNavigator"
import { getNavigationForRightOrBottomPage } from "../resolvers/getNavigationForRightOrBottomPage"
import { getNavigationForLeftOrTopPage } from "../resolvers/getNavigationForLeftOrTopPage"
import { UserNavigationEntry } from "../../../navigation/UserNavigator"
import { report } from "../report"

export class ManualNavigator {
  movingLastDelta = { x: 0, y: 0 }
  movingLastPosition: ViewportPosition = { x: 0, y: 0 }
  unlock: ReturnType<Reader["navigation"]["lock"]> | undefined = undefined

  constructor(protected reader: Reader) {}

  turnRight() {
    return this.turnRightOrBottom()
  }

  turnLeft() {
    return this.turnLeftOrTop()
  }

  turnTop() {
    return this.turnLeftOrTop()
  }

  turnBottom() {
    return this.turnRightOrBottom()
  }

  turnRightOrBottom() {
    const navigation = this.reader.navigation.getNavigation()
    const spineItem = this.reader.spineItemsManager.get(navigation.spineItem)

    if (!spineItem) return

    const position = getNavigationForRightOrBottomPage({
      context: this.reader.context,
      navigationResolver: this.reader.navigation.navigationResolver,
      position: navigation.position,
      computedPageTurnDirection:
        this.reader.settings.values.computedPageTurnDirection,
      spineItem,
      spineItemsManager: this.reader.spineItemsManager,
      spineLocator: this.reader.spine.locator,
    })

    return this.reader.navigation.navigate({
      position,
    })
  }

  turnLeftOrTop() {
    const navigation = this.reader.navigation.getNavigation()
    const spineItem = this.reader.spineItemsManager.get(navigation.spineItem)

    if (!spineItem) return

    const position = getNavigationForLeftOrTopPage({
      context: this.reader.context,
      navigationResolver: this.reader.navigation.navigationResolver,
      position: navigation.position,
      computedPageTurnDirection:
        this.reader.settings.values.computedPageTurnDirection,
      spineItem,
      spineItemsManager: this.reader.spineItemsManager,
      spineLocator: this.reader.spine.locator,
    })

    return this.reader.navigation.navigate({
      position,
    })
  }

  goToCfi(cfi: string, options: { animate: boolean } = { animate: true }) {
    return this.reader.navigation.navigate({
      animation: options.animate ? "turn" : false,
      cfi,
    })
  }

  goToSpineItem({
    indexOrId,
    ...rest
  }: { indexOrId: number | string } & Pick<UserNavigationEntry, "animation">) {
    const spineItem = this.reader.spineItemsManager.get(indexOrId)

    if (spineItem === undefined) {
      Report.warn(
        `goToSpineItem`,
        `Ignore navigation to ${indexOrId} since the item does not exist`,
      )

      return
    }

    this.reader.navigation.navigate({
      spineItem: indexOrId,
      ...rest,
    })
  }

  goToNextSpineItem() {
    const { endIndex = 0 } =
      this.reader.spine.locator.getVisibleSpineItemsFromPosition({
        position: this.reader.navigation.getNavigation().position,
        threshold: 0.5,
      }) || {}

    this.goToSpineItem({ indexOrId: endIndex + 1 })
  }

  goToPreviousSpineItem() {
    const { beginIndex = 0 } =
      this.reader.spine.locator.getVisibleSpineItemsFromPosition({
        position: this.reader.navigation.getNavigation().position,
        threshold: 0.5,
      }) ?? {}

    this.goToSpineItem({ indexOrId: beginIndex - 1 })
  }

  goToUrl(url: string | URL) {
    this.reader.navigation.navigate({
      url,
    })
  }

  goToRightSpineItem() {
    if (this.reader.settings.values.computedPageTurnDirection === "vertical") {
      Report.warn(
        `You cannot call this navigation method on vertical direction`,
      )

      return
    }

    if (this.reader.context.isRTL()) {
      return this.goToPreviousSpineItem()
    }

    return this.goToNextSpineItem()
  }

  goToRightOrBottomSpineItem() {
    if (this.reader.settings.values.computedPageTurnDirection === "vertical") {
      return this.goToBottomSpineItem()
    }

    return this.goToRightSpineItem()
  }

  goToLeftOrTopSpineItem() {
    if (this.reader.settings.values.computedPageTurnDirection === "vertical") {
      return this.goToTopSpineItem()
    }

    return this.goToLeftSpineItem()
  }

  goToLeftSpineItem() {
    if (this.reader.settings.values.computedPageTurnDirection === "vertical") {
      Report.warn(
        `You cannot call this navigation method on vertical direction`,
      )

      return
    }

    if (this.reader.context.isRTL()) {
      return this.goToNextSpineItem()
    }

    return this.goToPreviousSpineItem()
  }

  goToTopSpineItem() {
    if (
      this.reader.settings.values.computedPageTurnDirection === "horizontal"
    ) {
      Report.warn(
        `You cannot call this navigation method on horizontal direction`,
      )

      return
    }

    return this.goToPreviousSpineItem()
  }

  goToBottomSpineItem() {
    if (
      this.reader.settings.values.computedPageTurnDirection === "horizontal"
    ) {
      Report.warn(
        `You cannot call this navigation method on horizontal direction`,
      )

      return
    }

    return this.goToNextSpineItem()
  }

  goToPageOfSpineItem({
    pageIndex,
    spineItemId,
    ...rest
  }: {
    pageIndex: number
    spineItemId: string | number
  } & Pick<UserNavigationEntry, "animation">) {
    const position =
      this.reader.navigation.navigationResolver.getNavigationForSpineItemPage({
        pageIndex,
        spineItemId,
      })

    report.debug(`.goToPageOfSpineItem()`, {
      pageIndex,
      spineItemId,
      ...rest,
      position,
    })

    this.reader.navigation.navigate({
      position,
      ...rest,
    })
  }

  goToAbsolutePageIndex({
    absolutePageIndex,
    ...rest
  }: { absolutePageIndex: number } & Pick<UserNavigationEntry, "animation">) {
    const foundInfo =
      this.reader.spine.locator.getSpineInfoFromAbsolutePageIndex({
        absolutePageIndex,
      })

    report.debug(`.goToAbsolutePageIndex()`, {
      absolutePageIndex,
      ...rest,
      foundInfo,
    })

    if (foundInfo) {
      const position =
        this.reader.navigation.navigationResolver.getNavigationForSpineItemPage(
          {
            pageIndex: foundInfo.pageIndex,
            spineItemId: foundInfo.itemIndex,
          },
        )

      return this.reader.navigation.navigate({
        position,
        ...rest,
      })
    }
  }
}

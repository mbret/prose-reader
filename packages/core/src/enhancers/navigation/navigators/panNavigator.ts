import type { Reader } from "../../../reader"
import { Report } from "../../../report"
import { SpinePosition } from "../../../spine/types"
import { translateSpinePositionToRelativeViewport } from "../../../viewport/translateSpinePositionToRelativeViewport"

export class PanNavigator {
  lastDelta = { x: 0, y: 0 }
  lastPosition = new SpinePosition({ x: 0, y: 0 })
  lastStartPosition = new SpinePosition({ x: 0, y: 0 })
  unlock: ReturnType<Reader["navigation"]["lock"]> | undefined = undefined

  constructor(protected reader: Reader) {}

  moveTo(
    delta: { x: number; y: number } | undefined,
    { final, start }: { start?: boolean; final?: boolean } = {},
  ) {
    if (this.reader.settings.values.computedPageTurnMode === `scrollable`) {
      Report.warn(`pan control is not available on free page turn mode`)

      return
    }

    const pageTurnDirection =
      this.reader.settings.values.computedPageTurnDirection

    if (start) {
      this.unlock?.()
      this.unlock = this.reader.navigation.lock()

      this.lastDelta = { x: 0, y: 0 }
      this.lastStartPosition =
        this.reader.navigation.controlledController.viewportPosition
      this.lastPosition = this.lastStartPosition
    }

    let navigation: SpinePosition =
      this.reader.navigation.getNavigation().position

    if (delta) {
      const viewportScale =
        this.reader.viewport.absoluteViewport.width /
        this.reader.viewport.absoluteViewport.width

      /**
       * We floor the delta to avoid having wrong direction derived because of
       * some sub pixel difference due to gesture precision
       */
      const correctedX = Math.floor(delta.x) - (this.lastDelta?.x || 0)
      const correctedY = Math.floor(delta.y) - (this.lastDelta?.y || 0)
      const x = Math.floor(
        pageTurnDirection === `horizontal`
          ? this.lastPosition.x - correctedX / viewportScale
          : 0,
      )
      const y = Math.floor(
        pageTurnDirection === `horizontal`
          ? 0
          : this.lastPosition.y - correctedY / viewportScale,
      )

      navigation = new SpinePosition({
        x,
        y,
      })

      this.lastDelta = delta
    } else {
      navigation = this.lastPosition
    }

    this.lastPosition = navigation

    if (final) {
      this.lastDelta = { x: 0, y: 0 }

      this.reader.navigation.navigate({
        position: navigation,
        animation: false,
      })

      this.unlock?.()

      return
    }

    this.reader.navigation.navigate({
      position: navigation,
      animation: false,
    })
  }
}

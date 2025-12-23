import type { Reader } from "../../../reader"
import { SpinePosition, type UnboundSpinePosition } from "../../../spine/types"
import { ReactiveEntity } from "../../../utils/ReactiveEntity"
import { navigationReport } from "../report"
export class PanNavigator extends ReactiveEntity<{
  lastDelta: { x: number; y: number }
  lastPosition: SpinePosition | UnboundSpinePosition
  lastStartPosition: SpinePosition
  isStarted: boolean
}> {
  unlock: ReturnType<Reader["navigation"]["lock"]> | undefined = undefined

  constructor(protected reader: Reader) {
    super({
      lastDelta: { x: 0, y: 0 },
      lastPosition: new SpinePosition({ x: 0, y: 0 }),
      lastStartPosition: new SpinePosition({ x: 0, y: 0 }),
      isStarted: false,
    })
  }

  start(delta: { x: number; y: number }) {
    this.unlock?.()
    this.unlock = this.reader.navigation.lock()

    this.mergeCompare({
      isStarted: true,
      lastDelta: delta,
      lastStartPosition:
        this.reader.navigation.controlledNavigationController.viewportPosition,
      lastPosition:
        this.reader.navigation.controlledNavigationController.viewportPosition,
    })
  }

  stop(delta: { x: number; y: number }) {
    this.panMoveTo(delta)

    this.mergeCompare({
      isStarted: false,
    })

    this.unlock?.()
  }

  panMoveTo(delta: { x: number; y: number } | undefined) {
    if (this.reader.settings.values.computedPageTurnMode === `scrollable`) {
      navigationReport.warn(
        `pan control is not available on free page turn mode`,
      )

      return
    }

    if (!this.value.isStarted) {
      navigationReport.error(`Pan navigator is not started`)

      return
    }

    const pageTurnDirection =
      this.reader.settings.values.computedPageTurnDirection

    let navigation: SpinePosition | UnboundSpinePosition =
      this.reader.navigation.getNavigation().position

    if (delta) {
      const viewportScale =
        this.reader.viewport.absoluteViewport.width /
        this.reader.viewport.relativeViewport.width
      /**
       * We floor the delta to avoid having wrong direction derived because of
       * some sub pixel difference due to gesture precision
       */
      const correctedX = Math.floor(delta.x) - (this.value.lastDelta?.x || 0)
      const correctedY = Math.floor(delta.y) - (this.value.lastDelta?.y || 0)
      const x = Math.floor(
        pageTurnDirection === `horizontal`
          ? this.value.lastPosition.x - correctedX / viewportScale
          : 0,
      )
      const y = Math.floor(
        pageTurnDirection === `horizontal`
          ? 0
          : this.value.lastPosition.y - correctedY / viewportScale,
      )

      navigation = new SpinePosition({
        x,
        y,
      })

      this.mergeCompare({
        lastDelta: delta,
      })
    } else {
      navigation = this.value.lastPosition
    }

    this.mergeCompare({
      lastPosition: navigation,
    })

    this.reader.navigation.navigate({
      position: navigation,
      animation: false,
    })
  }
}

import {
  EMPTY,
  merge,
  type ObservedValueOf,
  Subject,
  switchMap,
  takeUntil,
  tap,
  timer,
} from "rxjs"
import { HTML_PREFIX } from "../../constants"
import type { Reader } from "../../reader"
import { ReactiveEntity } from "../../utils/ReactiveEntity"
import {
  applyViewportTransformForControlledMode,
  derivePositionFromScaleForControlledMode,
} from "./controlled"
import { deriveSpinePositionFromScale } from "./scrollable"

export type ZoomControllerState = {
  isZooming: boolean
  currentScale: number
  currentPosition: { x: number; y: number }
}

/**
 * @important
 * Animation is not possible for scrolling mode because the animation
 * is based on transform origin and its impossible to have a correct
 * centered transform origin with the viewport in a scrollable container.
 * What we do is compute the "wanted" scroll position to make it look like
 * scale down/up appears centered.
 */
const ANIMATION_DURATION = 200

export class ZoomController extends ReactiveEntity<ZoomControllerState> {
  private enterSubject = new Subject<
    | undefined
    | {
        element?: HTMLImageElement
        scale?: number
        animate?: boolean
      }
  >()
  private exitSubject = new Subject<{ animate?: boolean } | undefined>()

  constructor(protected reader: Reader) {
    super({
      isZooming: false,
      currentScale: 1,
      currentPosition: { x: 0, y: 0 },
    })

    const enter$ = this.enterSubject.pipe(
      switchMap((options) => {
        const { scale = 1, animate = false } = options ?? {}
        const viewportElement = this.reader.viewport.value.element

        this.viewport.element.setAttribute(
          `data-${HTML_PREFIX}-zooming`,
          "true",
        )

        this.scrollNavigationController.value.element?.setAttribute(
          `data-${HTML_PREFIX}-zooming`,
          this.isControlled ? "false" : "true",
        )

        if (animate && this.isControlled) {
          viewportElement.style.transition = `transform ${ANIMATION_DURATION}ms`
        }

        this.mergeCompare({
          isZooming: true,
          currentScale: 1,
          currentPosition: { x: 0, y: 0 },
        })

        this.updateZoom(scale)

        if (scale !== 1 && this.isControlled) {
          return timer(options?.animate ? ANIMATION_DURATION : 0).pipe(
            tap(() => {
              this.reader.layout()
            }),
          )
        }

        return EMPTY
      }),
    )

    const exit$ = this.exitSubject.pipe(
      switchMap((options) => {
        const viewportElement = this.reader.viewport.value.element

        this.viewport.element.setAttribute(
          `data-${HTML_PREFIX}-zooming`,
          "false",
        )

        this.scrollNavigationController.value.element?.removeAttribute(
          `data-${HTML_PREFIX}-zooming-direction`,
        )
        this.scrollNavigationController.value.element?.setAttribute(
          `data-${HTML_PREFIX}-zooming`,
          "false",
        )

        if (options?.animate && this.isControlled) {
          viewportElement.style.transition = `transform ${ANIMATION_DURATION}ms`
        }

        this.updateZoom(1, { x: 0, y: 0 })

        viewportElement.style.transform = ``

        return timer(options?.animate ? ANIMATION_DURATION : 0).pipe(
          tap(() => {
            const viewportElement = this.reader.viewport.value.element
            viewportElement.style.transformOrigin = ``
            viewportElement.style.transition = ``

            if (this.isControlled) {
              this.reader.layout()
            }

            this.mergeCompare({
              isZooming: false,
            })
          }),
          takeUntil(this.enterSubject),
        )
      }),
    )

    merge(enter$, exit$).pipe(takeUntil(this.destroy$)).subscribe()
  }

  public enter(options?: ObservedValueOf<typeof this.enterSubject>) {
    this.enterSubject.next(options)
  }

  public exit(options?: ObservedValueOf<typeof this.exitSubject>) {
    this.exitSubject.next(options)
  }

  public move(position: { x: number; y: number }) {
    // no moving needed for scrollable mode
    if (!this.isControlled) return

    // make sure to prevent animation before applying the new position
    this.viewport.element.style.transition = ``

    this.updateZoom(this.value.currentScale, position)
  }

  public scaleAt(userScale: number): void {
    // make sure to prevent animation before applying the new position
    this.viewport.element.style.transition = ``

    const roundedScale = Math.ceil(userScale * 100) / 100
    const newScale = roundedScale

    this.updateZoom(newScale)
  }

  protected updateZoom(scale: number, position?: { x: number; y: number }) {
    if (this.isControlled) {
      const newPosition = position
        ? position
        : derivePositionFromScaleForControlledMode(
            this.value.currentScale,
            scale,
            this.viewport.element,
            this.value.currentPosition,
          )

      this.applyZoom(scale, newPosition)

      return this.mergeCompare({
        currentScale: scale,
        currentPosition: newPosition,
      })
    }

    this.applyZoom(scale, position ?? this.value.currentPosition)

    this.mergeCompare({
      currentScale: scale,
    })
  }

  protected applyZoom(scale: number, position: { x: number; y: number }) {
    if (!this.isControlled) {
      const spinePosition = deriveSpinePositionFromScale(scale, this.reader)

      this.reader.navigation.navigate({
        position: spinePosition,
      })
    } else {
      applyViewportTransformForControlledMode(
        scale,
        position,
        this.viewport.element,
      )
    }
  }

  protected get isControlled() {
    return this.reader.settings.values.computedPageTurnMode === "controlled"
  }

  protected get scrollNavigationController() {
    return this.reader.navigation.scrollNavigationController
  }

  protected get viewport() {
    return this.reader.viewport.value
  }
}

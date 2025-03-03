import {
  BehaviorSubject,
  type Observable,
  Subject,
  animationFrameScheduler,
  combineLatest,
  delay,
  identity,
  map,
  merge,
  mergeMap,
  of,
  share,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import { HTML_PREFIX } from "../../constants"
import type { Context } from "../../context/Context"
import type { HookManager } from "../../hooks/HookManager"
import { Report } from "../../report"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { Spine } from "../../spine/Spine"
import { SpinePosition } from "../../spine/types"
import { DestroyableClass } from "../../utils/DestroyableClass"
import type { Viewport } from "../../viewport/Viewport"
import {
  spinePositionToTranslation,
  translationToSpinePosition,
} from "./positions"

const NAMESPACE = `navigation/ViewportNavigator`

const report = Report.namespace(NAMESPACE)

export type DeprecatedViewportPosition = SpinePosition

export type ViewportNavigationEntry = {
  position: SpinePosition
  animation?: boolean | "turn" | "snap"
}

export class ViewportNavigator extends DestroyableClass {
  protected navigateSubject = new Subject<ViewportNavigationEntry>()

  public readonly element$ = new BehaviorSubject<HTMLElement>(
    document.createElement(`div`),
  )
  public isNavigating$: Observable<boolean>
  public layout$: Observable<unknown>

  constructor(
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
    protected context: Context,
    protected spine: Spine,
    protected viewport: Viewport,
  ) {
    super()

    const elementInit$ = this.spine.element$.pipe(
      withLatestFrom(this.element$),
      tap(([spineElement, element]) => {
        element.style.cssText = `
          height: 100%;
          width: 100%;
          position: relative;
        `
        element.className = `${HTML_PREFIX}-controlled-navigator`
        element.innerHTML = ``
        element.appendChild(spineElement)
        this.viewport.value.element.appendChild(element)
        this.element$.next(element)
      }),
    )

    const settingsThatRequireLayout$ = settings.watch([
      `computedPageTurnDirection`,
      `computedPageTurnMode`,
      `numberOfAdjacentSpineItemToPreLoad`,
    ])

    /**
     * Watch for settings update that require changes
     * on this layer.
     *
     * @important
     * Try not to have duplicate with other lower components that also listen to settings change and re-layout
     * on the same settings.
     */
    const updateElementOnSettingsChange$ = combineLatest([
      settingsThatRequireLayout$,
      this.element$,
    ]).pipe(
      tap(([, element]) => {
        if (settings.values.computedPageTurnMode === `scrollable`) {
          element.style.display = `contents`
        } else {
          element.style.display = `block`
        }
      }),
    )

    this.layout$ = updateElementOnSettingsChange$.pipe(
      tap(() => {
        report.info(`layout`, settings.values)
      }),
      share(),
    )

    const navigate$ = this.navigateSubject.pipe(
      tap((navigation) => {
        report.info(`Navigation requested`, navigation)
      }),
    )

    this.isNavigating$ = navigate$.pipe(
      map(({ animation, position }) => {
        const shouldAnimate = !(
          !animation ||
          (animation === `turn` &&
            settings.values.computedPageTurnAnimation === `none`)
        )

        return {
          type: `manualAdjust` as const,
          shouldAnimate,
          animation,
          position,
        }
      }),
      switchMap((currentEvent) => {
        const element = this.element$.getValue()

        // cleanup potential previous manual adjust
        element.style.setProperty(`transition`, `none`)
        element.style.setProperty(`opacity`, `1`)

        return merge(
          of(true),
          of(null).pipe(
            mergeMap(() => {
              if (currentEvent?.type !== `manualAdjust`) return of(false)

              const animationDuration =
                currentEvent.animation === `snap`
                  ? settings.values.snapAnimationDuration
                  : settings.values.computedPageTurnAnimationDuration
              const pageTurnAnimation =
                currentEvent.animation === `snap`
                  ? (`slide` as const)
                  : settings.values.computedPageTurnAnimation

              return of(currentEvent).pipe(
                /**
                 * @important
                 * Optimization:
                 * When the adjustment does not need animation it means we want to be there as fast as possible
                 * One example is when we adjust position after layout. In this case we don't want to have flicker or see
                 * anything for x ms while we effectively adjust. We want it to be immediate.
                 * However when user is repeatedly turning page, we can improve smoothness by delaying a bit the adjustment
                 */
                currentEvent.shouldAnimate
                  ? delay(1, animationFrameScheduler)
                  : identity,
                tap((data) => {
                  const element = this.element$.getValue()
                  const noAdjustmentNeeded = false

                  if (data.shouldAnimate && !noAdjustmentNeeded) {
                    if (pageTurnAnimation === `fade`) {
                      element.style.setProperty(
                        `transition`,
                        `opacity ${animationDuration / 2}ms`,
                      )
                      element.style.setProperty(`opacity`, `0`)
                    } else if (
                      currentEvent.animation === `snap` ||
                      pageTurnAnimation === `slide`
                    ) {
                      element.style.setProperty(
                        `transition`,
                        `transform ${animationDuration}ms`,
                      )
                      element.style.setProperty(`opacity`, `1`)
                    }
                  } else {
                    element.style.setProperty(`transition`, `none`)
                    element.style.setProperty(`opacity`, `1`)
                  }
                }),
                /**
                 * @important
                 * We always need to adjust the reading offset. Even if the current viewport value
                 * is the same as the payload position. This is because an already running animation could
                 * be active, meaning the viewport is still adjusting itself (after animation duration). So we
                 * need to adjust to anchor to the payload position. This is because we use viewport computed position,
                 * not the value set by `setProperty`
                 */
                tap((data) => {
                  if (pageTurnAnimation !== `fade`) {
                    this.setViewportPosition(data.position)
                  }
                }),
                currentEvent.shouldAnimate
                  ? delay(animationDuration / 2, animationFrameScheduler)
                  : identity,
                tap((data) => {
                  const element = this.element$.getValue()

                  if (pageTurnAnimation === `fade`) {
                    this.setViewportPosition(data.position)
                    element.style.setProperty(`opacity`, `1`)
                  }
                }),
                currentEvent.shouldAnimate
                  ? delay(animationDuration / 2, animationFrameScheduler)
                  : identity,
                tap((data) => {
                  if (pageTurnAnimation === `fade`) {
                    this.setViewportPosition(data.position)
                  }
                }),
              )
            }),
            map(() => false),
          ),
        )
      }),
      startWith(false),
      shareReplay(1),
    )

    merge(elementInit$, this.isNavigating$, this.layout$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  /**
   * Programmatically set the viewport position.
   *
   * Usually occurs due to navigation.
   *
   * @see https://stackoverflow.com/questions/22111256/translate3d-vs-translate-performance
   * for remark about flicker / fonts smoothing
   */
  protected setViewportPosition(position: SpinePosition) {
    const element = this.element$.getValue()

    const translation = spinePositionToTranslation(position)
    element.style.transform = `translate(${translation.x}px, ${translation.y}px)`

    this.hookManager.execute("onViewportOffsetAdjust", undefined, {})
  }

  navigate(navigation: ViewportNavigationEntry) {
    this.navigateSubject.next(navigation)
  }

  /**
   * @important The reason we use computed transform and not bounding client is to avoid
   * transofmration inconsistency between the viewport and the spine.
   */
  public get viewportPosition(): SpinePosition {
    const element = this.element$.getValue()

    const computedStyle = window.getComputedStyle(element)
    const transform = computedStyle.transform || computedStyle.webkitTransform

    if (!transform || transform === "none") {
      return new SpinePosition({ x: 0, y: 0 })
    }

    // Parse the transform matrix
    // The matrix is in the format: matrix(a, b, c, d, tx, ty) or matrix3d(...)
    const matrix = new DOMMatrix(transform)

    return translationToSpinePosition(matrix)
  }
}

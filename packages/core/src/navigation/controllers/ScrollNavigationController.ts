import {
  BehaviorSubject,
  type Observable,
  Subject,
  combineLatest,
  distinctUntilChanged,
  map,
  merge,
  of,
  shareReplay,
  skip,
  startWith,
  switchMap,
  takeUntil,
  tap,
  timer,
  withLatestFrom,
} from "rxjs"
import { HTML_PREFIX } from "../../constants"
import type { Context } from "../../context/Context"
import type { HookManager } from "../../hooks/HookManager"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { Spine } from "../../spine/Spine"
import { SpinePosition } from "../../spine/types"
import { DestroyableClass } from "../../utils/DestroyableClass"
import type { Viewport } from "../../viewport/Viewport"
import type { ViewportNavigationEntry } from "./ControlledNavigationController"
import { getScaledDownPosition } from "./getScaledDownPosition"

export class ScrollNavigationController extends DestroyableClass {
  protected navigateSubject = new Subject<ViewportNavigationEntry>()
  protected scrollingSubject = new BehaviorSubject(false)

  public readonly element$ = new BehaviorSubject<HTMLElement>(
    document.createElement(`div`),
  )
  public isScrolling$ = this.scrollingSubject.asObservable()
  public isNavigating$: Observable<boolean>

  constructor(
    protected viewport: Viewport,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
    protected spine: Spine,
    protected context: Context,
  ) {
    super()

    const elementInit$ = this.context.pipe(
      map(({ rootElement }) => rootElement),
      distinctUntilChanged(),
      withLatestFrom(this.element$),
      tap(([parentElement, element]) => {
        if (!parentElement) return

        // overflowX prevent the scroll bar on the bottom, effectively
        // hiden a small x part on non mobile device.
        element.style.cssText = `
          height: 100%;
          width: 100%;
          position: relative;
          overflow-y: scroll;
          overflow-x: hidden;
        `
        element.className = `${HTML_PREFIX}-scroll-navigator`
        element.appendChild(this.viewport.value.element)
        parentElement.appendChild(element)

        this.element$.next(element)
      }),
    )

    const toggleElementDisplay$ = combineLatest([
      settings.watch([`computedPageTurnMode`]),
      this.element$,
    ]).pipe(
      tap(([{ computedPageTurnMode }, element]) => {
        if (computedPageTurnMode === `scrollable`) {
          element.style.display = "block"
        } else {
          element.style.display = "contents"
        }
      }),
    )

    const navigate$ = this.navigateSubject.pipe(tap(this.setViewportPosition))

    this.isNavigating$ = this.navigateSubject.pipe(
      startWith(false),
      switchMap(() => merge(of(true), of(false))),
      shareReplay(1),
    )

    merge(this.isNavigating$, elementInit$, toggleElementDisplay$, navigate$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  /**
   *
   * Usually occurs due to navigation.
   *
   * @see https://stackoverflow.com/questions/22111256/translate3d-vs-translate-performance
   * for remark about flicker / fonts smoothing
   */
  protected setViewportPosition = ({ position }: ViewportNavigationEntry) => {
    const element = this.element$.getValue()

    this.scrollingSubject.next(true)

    // @todo use smooth later and adjust the class to avoid false positive
    // @todo see scrollend
    element.scrollTo({
      left: position.x,
      top: position.y,
      behavior: "instant",
    })

    timer(1)
      .pipe(
        tap(() => {
          this.scrollingSubject.next(false)
        }),
        takeUntil(merge(this.scrollingSubject.pipe(skip(1)), this.destroy$)),
      )
      .subscribe()

    this.hookManager.execute("onViewportOffsetAdjust", undefined, {})
  }

  navigate(navigation: ViewportNavigationEntry) {
    this.navigateSubject.next(navigation)
  }

  public get viewportPosition(): SpinePosition {
    const element = this.element$.getValue()

    /**
     * We need to scale down cause a scrollbar might create inconsistency between navigation
     * element and spine.
     *
     * @todo Don't remember why this is needed exactly, need to be explained once found
     * out again.
     */
    return getScaledDownPosition({
      element,
      position: new SpinePosition({
        x: element?.scrollLeft ?? 0,
        y: element?.scrollTop ?? 0,
      }),
      spineElement: this.spine.element,
    })
  }
}

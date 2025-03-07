import {
  BehaviorSubject,
  NEVER,
  type Observable,
  Subject,
  combineLatest,
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  merge,
  of,
  share,
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
import { ReactiveEntity } from "../../utils/ReactiveEntity"
import { isDefined } from "../../utils/isDefined"
import { observeResize, watchKeys } from "../../utils/rxjs"
import type { Viewport } from "../../viewport/Viewport"
import type { ViewportNavigationEntry } from "./ControlledNavigationController"
import { getScaledDownPosition } from "./getScaledDownPosition"

export class ScrollNavigationController extends ReactiveEntity<{
  element: HTMLElement | undefined
}> {
  protected navigateSubject = new Subject<ViewportNavigationEntry>()
  protected scrollingSubject = new BehaviorSubject(false)

  public isScrolling$ = this.scrollingSubject.asObservable()
  public isNavigating$: Observable<boolean>
  public userScroll$: Observable<Event>

  constructor(
    protected viewport: Viewport,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
    protected spine: Spine,
    protected context: Context,
  ) {
    super({
      element: undefined,
    })

    const elementCreation$ = this.context.pipe(
      watchKeys(["rootElement"]),
      tap(({ rootElement }) => {
        if (!rootElement) return

        const element = document.createElement(`div`)

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
        rootElement.appendChild(element)

        this.update({ element })
      }),
    )

    const toggleElementDisplay$ = combineLatest([
      settings.watch([`computedPageTurnMode`]),
      this.watch("element"),
    ]).pipe(
      tap(([{ computedPageTurnMode }, element]) => {
        if (!element) return

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

    // might be a bit overkill but we want to be sure of sure
    const isSpineScrolling$ = merge(
      spine.element$.pipe(switchMap((element) => observeResize(element))),
      spine.element$.pipe(switchMap((element) => fromEvent(element, "scroll"))),
      spine.spineItemsObserver.itemResize$,
    ).pipe(
      switchMap(() =>
        timer(10).pipe(
          map(() => false),
          startWith(true),
        ),
      ),
      distinctUntilChanged(),
      startWith(false),
    )

    const scrollHappeningFromBrowser$ = combineLatest([
      isSpineScrolling$,
      this.isScrolling$,
    ]).pipe(
      map(
        ([spineScrolling, viewportScrolling]) =>
          spineScrolling || viewportScrolling,
      ),
      shareReplay(1),
    )

    this.userScroll$ = this.watch("element").pipe(
      filter(isDefined),
      switchMap((element) =>
        settings.watch(["computedPageTurnMode"]).pipe(
          switchMap(({ computedPageTurnMode }) =>
            computedPageTurnMode === "controlled"
              ? NEVER
              : fromEvent(element, `scroll`).pipe(
                  withLatestFrom(scrollHappeningFromBrowser$),
                  filter(
                    ([, shouldAvoidScrollEvent]) => !shouldAvoidScrollEvent,
                  ),
                  map(([event]) => event),
                ),
          ),
        ),
      ),
      share(),
    )

    merge(elementCreation$, toggleElementDisplay$, navigate$)
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
    const element = this.value.element

    this.scrollingSubject.next(true)

    // @todo use smooth later and adjust the class to avoid false positive
    // @todo see scrollend
    element?.scrollTo({
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

  public update(
    value: Partial<{
      element: HTMLElement | undefined
    }>,
  ) {
    this.mergeCompare(value)
  }

  navigate(navigation: ViewportNavigationEntry) {
    this.navigateSubject.next(navigation)
  }

  public get viewportPosition(): SpinePosition {
    const element = this.value.element

    if (!element) return new SpinePosition({ x: 0, y: 0 })

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

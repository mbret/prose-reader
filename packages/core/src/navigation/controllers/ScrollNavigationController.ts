import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  merge,
  NEVER,
  type Observable,
  of,
  Subject,
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
import { HTML_PREFIX_SCROLL_NAVIGATOR } from "../../constants"
import type { Context } from "../../context/Context"
import type { HookManager } from "../../hooks/HookManager"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { Spine } from "../../spine/Spine"
import { type SpinePosition, UnboundSpinePosition } from "../../spine/types"
import { AbstractPosition } from "../../types"
import { isDefined } from "../../utils/isDefined"
import { ReactiveEntity } from "../../utils/ReactiveEntity"
import { observeResize, watchKeys } from "../../utils/rxjs"
import type { Viewport } from "../../viewport/Viewport"

export class ScrollPosition extends AbstractPosition {}

export type ScrollNavigationViewportNavigationEntry = {
  position: UnboundSpinePosition | SpinePosition
}

export class ScrollNavigationController extends ReactiveEntity<{
  element: HTMLElement | undefined
}> {
  protected navigateSubject =
    new Subject<ScrollNavigationViewportNavigationEntry>()
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
        element.setAttribute(`data-${HTML_PREFIX_SCROLL_NAVIGATOR}`, "")
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
      spine.element$.pipe(
        filter(isDefined),
        switchMap((element) => observeResize(element)),
      ),
      spine.element$.pipe(
        filter(isDefined),
        switchMap((element) => fromEvent(element, "scroll")),
      ),
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
   * Usually occurs due to navigation.
   *
   * @see https://stackoverflow.com/questions/22111256/translate3d-vs-translate-performance
   * for remark about flicker / fonts smoothing
   */
  protected setViewportPosition = ({
    position,
  }: ScrollNavigationViewportNavigationEntry) => {
    const element = this.value.element

    this.scrollingSubject.next(true)

    const scaledPosition = this.fromSpinePosition(position)

    element?.scrollTo({
      left: scaledPosition.x,
      top: scaledPosition.y,
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

  navigate(navigation: ScrollNavigationViewportNavigationEntry) {
    this.navigateSubject.next(navigation)
  }

  public fromScrollPosition(position: ScrollPosition) {
    const scaleFactor = this.viewport.scaleFactor

    return new UnboundSpinePosition({
      x: position.x / scaleFactor,
      y: position.y / scaleFactor,
    })
  }

  public fromSpinePosition(position: UnboundSpinePosition | SpinePosition) {
    const scaleFactor = this.viewport.scaleFactor

    return new ScrollPosition({
      x: position.x * scaleFactor,
      y: position.y * scaleFactor,
    })
  }

  public get scrollPosition() {
    const element = this.value.element

    return new ScrollPosition({
      x: element?.scrollLeft ?? 0,
      y: element?.scrollTop ?? 0,
    })
  }
}

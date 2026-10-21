import { arrayEqual } from "@prose-reader/shared"
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  first,
  map,
  merge,
  type Observable,
  shareReplay,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import type { Context } from "../../context/Context"
import type { NavigationAgainstCurrentLayout } from "../../navigation/types"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItem } from "../../spineItem/SpineItem"
import { DestroyableClass } from "../../utils/DestroyableClass"
import { isDefined } from "../../utils/isDefined"
import type { Viewport } from "../../viewport/Viewport"
import type { SpineLocator } from "../locator/SpineLocator"
import type { SpineItemsManager } from "../SpineItemsManager"

export class SpineItemsLoader extends DestroyableClass {
  private forcedOpenSubject = new BehaviorSubject<Map<number, number>>(
    new Map(),
  )

  constructor(
    protected context: Context,
    protected spineItemsManager: SpineItemsManager,
    protected spineLocator: SpineLocator,
    protected settings: ReaderSettingsManager,
    protected viewport: Viewport,
    /** See `InternalNavigator.navigationAgainstCurrentLayout$`. */
    navigationAgainstCurrentLayout$: Observable<NavigationAgainstCurrentLayout>,
  ) {
    super()

    const forcedOpen$ = this.forcedOpenSubject.pipe(
      map((v) => Array.from(v.keys()).sort((a, b) => a - b)),
      distinctUntilChanged(arrayEqual),
      shareReplay({ bufferSize: 1, refCount: true }),
    )

    /**
     * The window is measured from the position of the latest navigation, once
     * the viewport is free and while the navigation holds on the current
     * layout: a navigation's position and the items' places only agree then.
     */
    const navigationToMeasureFrom$ = combineLatest([
      this.context.bridgeEvent.viewportState$,
      navigationAgainstCurrentLayout$,
    ]).pipe(
      map(([viewportState, { navigation, holdsOnCurrentLayout }]) =>
        viewportState === "free" && holdsOnCurrentLayout
          ? navigation
          : undefined,
      ),
      filter(isDefined),
    )

    /**
     * Every report of the latest navigation is a reason to measure again:
     * every layout ends with the navigation restored onto it, which is when
     * the window can be measured again.
     */
    const shouldReloadSpineItems$ = merge(
      navigationAgainstCurrentLayout$,
      this.viewport.layout$,
      forcedOpen$,
      settings.watch(["numberOfAdjacentSpineItemToPreLoad"]),
    )

    /**
     * Loading and unloading content has two important issues that need to be considered
     * - For reflow book it will un-sync the viewport
     * - Loading / unload is CPU intensive.
     *
     * Because of theses two reason we only load/unload when the adjustment is done. This ensure a smooth transition for the second point.
     * For the first point it avoid having content being un-sync while the transition is happening. That way we avoid a new chapter
     * to suddenly being displayed under the transition. The first issue is only a problem for reflow book as paginated will not
     * un-sync the viewport.
     * The flow for the first point is as follow:
     * [navigate] -> [transition] -> [new position] -> [iframe unload/load] -> (eventual adjustment).
     *
     * It would ne nice to be able to load/unload without having to worry about viewport mis-adjustment but due to the current iframe and viewport
     * layout method we have to take it into consideration.
     */
    const loadSpineItems$ = shouldReloadSpineItems$.pipe(
      // this can be changed by whatever we want and SHOULD not break navigation.
      // Ideally loading faster is better but loading too close to user navigating can
      // be dangerous.
      debounceTime(100),
      // Spine items exist from construction but must not render before mount
      // (their containers are detached and users may still register hooks).
      // Dropping pre-mount events is safe: mounting lays the reader out, and
      // the navigation restored onto that layout fires this stream again.
      filter(() => isDefined(this.context.value.rootElement)),
      switchMap(() => navigationToMeasureFrom$.pipe(first())),
      withLatestFrom(forcedOpen$),
      map(([{ position }, forcedOpenIndexes]) => {
        const { numberOfAdjacentSpineItemToPreLoad } = settings.values
        // these are real visible items to load
        const { beginIndex = 0, endIndex = 0 } =
          spineLocator.getVisibleSpineItemsFromPosition({
            position,
            threshold: { type: "percentage", value: 0 },
            useAbsoluteViewport: false,
          }) || {}

        // we increase the range based on settings
        const beginMaximumIndex =
          numberOfAdjacentSpineItemToPreLoad === Infinity
            ? 0
            : beginIndex - numberOfAdjacentSpineItemToPreLoad
        const endMaximumIndex =
          numberOfAdjacentSpineItemToPreLoad === Infinity
            ? spineItemsManager.items.length - 1
            : endIndex + numberOfAdjacentSpineItemToPreLoad

        const visibleIndexes = Array.from(
          { length: endMaximumIndex - beginMaximumIndex + 1 },
          (_, i) => beginMaximumIndex + i,
        )

        // we combine with forced open to ensure we load the forced open items
        const indexesToLoad = [...forcedOpenIndexes, ...visibleIndexes]

        spineItemsManager.items.forEach((orderedSpineItem, index) => {
          if (indexesToLoad.includes(index)) {
            orderedSpineItem.load()
          } else {
            orderedSpineItem.unload()
          }
        })
      }),
    )

    loadSpineItems$.pipe(takeUntil(this.destroy$)).subscribe()
  }

  forceOpen(spineItems: (number | SpineItem)[]) {
    const indexes = spineItems.map((item) =>
      typeof item === "number" ? item : item.index,
    )

    const updateMap = (add: boolean) => {
      const map = this.forcedOpenSubject.value
      indexes.forEach((index) => {
        const count = map.get(index) || 0
        const newCount = add ? count + 1 : count - 1
        if (newCount <= 0) map.delete(index)
        else map.set(index, newCount)
      })
      this.forcedOpenSubject.next(map)
    }

    updateMap(true)

    return () => {
      if (this.isDestroyed) return
      updateMap(false)
    }
  }

  public destroy(): void {
    super.destroy()

    this.forcedOpenSubject.complete()
  }
}

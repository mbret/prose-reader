import { arrayEqual } from "@prose-reader/shared"
import {
  BehaviorSubject,
  animationFrameScheduler,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  shareReplay,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import { type SpineItem, waitForSwitch } from "../.."
import type { Context } from "../../context/Context"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { DestroyableClass } from "../../utils/DestroyableClass"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"
import type { SpineLocator } from "../locator/SpineLocator"

export class SpineItemsLoader extends DestroyableClass {
  private forcedOpenSubject = new BehaviorSubject<number[][]>([])

  constructor(
    protected context: Context,
    protected spineItemsManager: SpineItemsManager,
    protected spineLocator: SpineLocator,
    protected settings: ReaderSettingsManager,
    protected spineLayout: SpineLayout,
  ) {
    super()

    const forcedOpen$ = this.forcedOpenSubject.pipe(
      map((v) => [...new Set(v.flat())].sort()),
      distinctUntilChanged(arrayEqual),
      shareReplay({ bufferSize: 1, refCount: true }),
    )

    const shouldReloadSpineItems$ = merge(
      this.context.bridgeEvent.navigation$,
      this.spineLayout.layout$,
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
      debounceTime(100, animationFrameScheduler),
      waitForSwitch(this.context.bridgeEvent.viewportFree$),
      withLatestFrom(this.context.bridgeEvent.navigation$, forcedOpen$),
      map(([, navigation, forcedOpenIndexes]) => {
        const { numberOfAdjacentSpineItemToPreLoad } = settings.values
        // these are real visible items to load
        const { beginIndex = 0, endIndex = 0 } =
          spineLocator.getVisibleSpineItemsFromPosition({
            position: navigation.position,
            threshold: 0,
            useAbsoluteViewport: false,
          }) || {}

        // we increase the range based on settings
        const beginMaximumIndex =
          beginIndex - numberOfAdjacentSpineItemToPreLoad
        const endMaximumIndex = endIndex + numberOfAdjacentSpineItemToPreLoad

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

    this.forcedOpenSubject.next([...this.forcedOpenSubject.value, indexes])

    return () => {
      if (this.isDestroyed) return

      this.forcedOpenSubject.next(
        this.forcedOpenSubject.value.filter(
          (arrayOfIndexes) => arrayOfIndexes !== indexes,
        ),
      )
    }
  }

  public destroy(): void {
    super.destroy()

    this.forcedOpenSubject.complete()
  }
}

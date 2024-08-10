import {
  merge,
  filter,
  withLatestFrom,
  map,
  debounceTime,
  animationFrameScheduler,
  takeUntil,
  skip,
  distinctUntilChanged,
} from "rxjs"
import { SpineItemsManager } from "../SpineItemsManager"
import { SpineLocator } from "../locator/SpineLocator"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { DestroyableClass } from "../../utils/DestroyableClass"
import { loadItems } from "./loadItems"
import { mapToItemsToLoad } from "./mapToItemsToLoad"
import { waitForSwitch } from "../../utils/rxjs"

export class SpineItemsLoader extends DestroyableClass {
  constructor(
    protected context: Context,
    protected spineItemsManager: SpineItemsManager,
    protected spineLocator: SpineLocator,
    protected settings: ReaderSettingsManager,
  ) {
    super()

    const navigationUpdate$ = this.context.bridgeEvent.navigation$
    const layoutHasChanged$ = spineItemsManager.layout$.pipe(
      filter((hasChanged) => hasChanged),
    )
    const numberOfAdjacentSpineItemToPreLoad$ = settings.settings$.pipe(
      map(
        ({ numberOfAdjacentSpineItemToPreLoad }) =>
          numberOfAdjacentSpineItemToPreLoad,
      ),
      skip(1),
      distinctUntilChanged(),
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
    const loadSpineItems$ = merge(
      navigationUpdate$,
      layoutHasChanged$,
      numberOfAdjacentSpineItemToPreLoad$,
    ).pipe(
      // this can be changed by whatever we want and SHOULD not break navigation.
      // Ideally loading faster is better but loading too close to user navigating can
      // be dangerous.
      debounceTime(100, animationFrameScheduler),
      waitForSwitch(this.context.bridgeEvent.viewportFree$),
      withLatestFrom(this.context.bridgeEvent.navigation$),
      map(([, navigation]) => navigation.position),
      mapToItemsToLoad({ spineLocator }),
      loadItems({ spineItemsManager, settings }),
    )

    loadSpineItems$.pipe(takeUntil(this.destroy$)).subscribe()
  }
}

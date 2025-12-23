import { merge, takeUntil, tap } from "rxjs"
import type { HtmlEnhancerOutput } from "../html/enhancer"
import type {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { handleLinksNavigation } from "./links"
import { ManualNavigator } from "./navigators/manualNavigator"
import { PanNavigator } from "./navigators/panNavigator"
import { UserScrollNavigation } from "./navigators/UserScrollNavigation"
import { observeState } from "./state"
import { throttleLock } from "./throttleLock"
import type { NavigationEnhancerOutput } from "./types"

export const navigationEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer> & HtmlEnhancerOutput,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): Omit<InheritOutput, "load"> & NavigationEnhancerOutput => {
    const reader = next(options)
    const state$ = observeState(reader)
    const manualNavigator = new ManualNavigator(reader)
    const panNavigator = new PanNavigator(reader)
    const userScrollNavigation = new UserScrollNavigation(
      reader.navigation.scrollNavigationController,
      reader.navigation.locker,
    )

    const linksNavigation$ = handleLinksNavigation(reader, manualNavigator)
    const navigateOnUserScroll$ = userScrollNavigation.navigation$.pipe(
      tap((navigation) => {
        reader.navigation.navigate(navigation)
      }),
    )

    merge(linksNavigation$, navigateOnUserScroll$)
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    const load: NavigationEnhancerOutput["load"] = (options) => {
      const { cfi, ...rest } = options

      reader.load(rest)

      if (cfi) {
        manualNavigator.goToCfi(cfi, { animate: false })
      }
    }

    const destroy = () => {
      userScrollNavigation.destroy()
      reader.destroy()
    }

    return {
      ...reader,
      load,
      destroy,
      navigation: {
        ...reader.navigation,
        state$,
        throttleLock: ({ duration, trigger }) =>
          trigger.pipe(throttleLock({ duration, reader })),
        panNavigator,
        turnBottom: manualNavigator.turnBottom.bind(manualNavigator),
        turnTop: manualNavigator.turnTop.bind(manualNavigator),
        turnLeftOrTop: manualNavigator.turnLeftOrTop.bind(manualNavigator),
        turnRightOrBottom:
          manualNavigator.turnRightOrBottom.bind(manualNavigator),
        turnLeft: manualNavigator.turnLeft.bind(manualNavigator),
        turnRight: manualNavigator.turnRight.bind(manualNavigator),
        goToCfi: manualNavigator.goToCfi.bind(manualNavigator),
        goToUrl: manualNavigator.goToUrl.bind(manualNavigator),
        goToSpineItem: manualNavigator.goToSpineItem.bind(manualNavigator),
        goToNextSpineItem:
          manualNavigator.goToNextSpineItem.bind(manualNavigator),
        goToPreviousSpineItem:
          manualNavigator.goToPreviousSpineItem.bind(manualNavigator),
        goToLeftOrTopSpineItem:
          manualNavigator.goToLeftOrTopSpineItem.bind(manualNavigator),
        goToRightOrBottomSpineItem:
          manualNavigator.goToRightOrBottomSpineItem.bind(manualNavigator),
        goToTopSpineItem:
          manualNavigator.goToTopSpineItem.bind(manualNavigator),
        goToBottomSpineItem:
          manualNavigator.goToBottomSpineItem.bind(manualNavigator),
        goToLeftSpineItem:
          manualNavigator.goToLeftSpineItem.bind(manualNavigator),
        goToRightSpineItem:
          manualNavigator.goToRightSpineItem.bind(manualNavigator),
        goToPageOfSpineItem:
          manualNavigator.goToPageOfSpineItem.bind(manualNavigator),
        goToAbsolutePageIndex:
          manualNavigator.goToAbsolutePageIndex.bind(manualNavigator),
      },
    }
  }

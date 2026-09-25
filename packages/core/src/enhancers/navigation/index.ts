import type { Manifest } from "@prose-reader/shared"
import { merge, takeUntil, tap } from "rxjs"
import type {
  NavigationTarget,
  UserNavigationEntry,
} from "../../navigation/types"
import type { HtmlEnhancerOutput } from "../html/enhancer"
import type {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { outOfSpineBoundary } from "./boundary"
import { getUrlSelector } from "./getUrlSelector"
import { handleLinksNavigation } from "./links"
import { ManualNavigator } from "./navigators/manualNavigator"
import { PanNavigator } from "./navigators/panNavigator"
import { UserScrollNavigation } from "./navigators/UserScrollNavigation"
import { navigationReport } from "./report"
import { observeState } from "./state"
import { throttleLock } from "./throttleLock"
import type { NavigationEnhancerOutput, UrlNavigationTarget } from "./types"

/** A url is translated into a selector, which finds its element once loaded. */
const toSelector = (
  { value }: UrlNavigationTarget,
  manifest: Manifest,
): NavigationTarget | undefined => {
  const selector = getUrlSelector(value, manifest)

  if (!selector) {
    navigationReport.warn(`Ignore navigation to ${value}, outside the book`)
  }

  return selector
}

export const navigationEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer> & HtmlEnhancerOutput,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: Omit<InheritOptions, "target"> & {
      target?: NavigationTarget | UrlNavigationTarget
    },
  ): InheritOutput & NavigationEnhancerOutput => {
    const { target, ...rest } = options
    const reader = next({
      ...rest,
      target:
        target?.type === "url" ? toSelector(target, options.manifest) : target,
      // Only `target` changed, to one core takes; TS cannot rebuild the generic
      // options from `Omit`.
    } as InheritOptions)
    const state$ = observeState(reader)
    const outOfSpineBoundary$ = outOfSpineBoundary(reader)
    const manualNavigator = new ManualNavigator(reader)
    const panNavigator = new PanNavigator(reader)
    const userScrollNavigation = new UserScrollNavigation(
      reader.navigation.scrollNavigationController,
      reader.navigation.lock,
    )

    const navigateOnUserScroll$ = userScrollNavigation.navigation$.pipe(
      tap((navigation) => {
        reader.navigation.navigate(navigation)
      }),
    )

    /**
     * Core's targets, and urls, which it does not know: a url is translated
     * into a selector, which finds its element once its document is
     * loaded.
     */
    const navigate = (
      to: UserNavigationEntry<NavigationTarget | UrlNavigationTarget>,
    ) => {
      const { target } = to

      if (target.type !== "url")
        return reader.navigation.navigate({ ...to, target })

      const selector = toSelector(target, reader.context.manifest)

      if (selector) reader.navigation.navigate({ ...to, target: selector })
    }

    const goToUrl = (url: string | URL) =>
      navigate({ target: { type: "url", value: url }, animation: false })

    merge(handleLinksNavigation(reader, goToUrl), navigateOnUserScroll$)
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    const destroy = () => {
      userScrollNavigation.destroy()
      reader.destroy()
    }

    return {
      ...reader,
      destroy,
      navigation: {
        ...reader.navigation,
        navigate,
        goToUrl,
        state$,
        outOfSpineBoundary$,
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

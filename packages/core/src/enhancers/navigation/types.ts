import type { Observable } from "rxjs"
import type {
  NavigationTarget,
  UserNavigationEntry,
} from "../../navigation/types"
import type { outOfSpineBoundary } from "./boundary"
import type { ManualNavigator } from "./navigators/manualNavigator"
import type { PanNavigator } from "./navigators/panNavigator"
import type { observeState } from "./state"

/** The url of a spine item, optionally with an element id as its fragment. */
export type UrlNavigationTarget = { type: "url"; value: string | URL }

export type NavigationEnhancerOutput = {
  navigation: {
    navigate: (
      to: UserNavigationEntry<NavigationTarget | UrlNavigationTarget>,
    ) => void
    goToUrl: (url: string | URL) => void
    state$: ReturnType<typeof observeState>
    outOfSpineBoundary$: ReturnType<typeof outOfSpineBoundary>
    throttleLock: <T>(params: {
      duration: number
      trigger: Observable<T>
    }) => Observable<T>
    panNavigator: PanNavigator
    turnTop: ManualNavigator["turnTop"]
    turnBottom: ManualNavigator["turnBottom"]
    turnLeftOrTop: ManualNavigator["turnLeftOrTop"]
    turnRightOrBottom: ManualNavigator["turnRightOrBottom"]
    turnLeft: ManualNavigator["turnLeft"]
    turnRight: ManualNavigator["turnRight"]
    goToCfi: ManualNavigator["goToCfi"]
    goToSpineItem: ManualNavigator["goToSpineItem"]
    goToLeftSpineItem: ManualNavigator["goToLeftSpineItem"]
    goToRightSpineItem: ManualNavigator["goToRightSpineItem"]
    goToLeftOrTopSpineItem: ManualNavigator["goToLeftOrTopSpineItem"]
    goToRightOrBottomSpineItem: ManualNavigator["goToRightOrBottomSpineItem"]
    goToNextSpineItem: ManualNavigator["goToNextSpineItem"]
    goToPreviousSpineItem: ManualNavigator["goToPreviousSpineItem"]
    goToTopSpineItem: ManualNavigator["goToTopSpineItem"]
    goToBottomSpineItem: ManualNavigator["goToBottomSpineItem"]
    goToPageOfSpineItem: ManualNavigator["goToPageOfSpineItem"]
    goToAbsolutePageIndex: ManualNavigator["goToAbsolutePageIndex"]
  }
}

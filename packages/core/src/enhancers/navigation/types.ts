import type { Observable } from "rxjs"
import type { Reader } from "../../reader"
import type { ManualNavigator } from "./navigators/manualNavigator"
import type { PanNavigator } from "./navigators/panNavigator"
import type { observeState } from "./state"

export type NavigationEnhancerOutput = {
  load: (options: Parameters<Reader["load"]>[0] & { cfi?: string }) => void
  navigation: {
    state$: ReturnType<typeof observeState>
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
    goToUrl: ManualNavigator["goToUrl"]
    goToPageOfSpineItem: ManualNavigator["goToPageOfSpineItem"]
    goToAbsolutePageIndex: ManualNavigator["goToAbsolutePageIndex"]
  }
}

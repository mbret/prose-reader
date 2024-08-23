import { Observable } from "rxjs"
import { Reader } from "../../reader"
import { ManualNavigator } from "./navigators/manualNavigator"
import { PanNavigator } from "./navigators/panNavigator"
import { observeState } from "./state"

export type NavigationEnhancerOutput = {
  load: (options: Parameters<Reader["load"]>[0] & { cfi?: string }) => void
  navigation: {
    state$: ReturnType<typeof observeState>
    throttleLock: <T>(params: {
      duration: number
      trigger: Observable<T>
    }) => Observable<T>
    moveTo: PanNavigator["moveTo"]
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
    goToTopSpineItem: ManualNavigator["goToTopSpineItem"]
    goToBottomSpineItem: ManualNavigator["goToBottomSpineItem"]
    goToUrl: ManualNavigator["goToUrl"]
    goToPageOfSpineItem: ManualNavigator["goToPageOfSpineItem"]
  }
}

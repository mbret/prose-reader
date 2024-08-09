import { ManualNavigator } from "./navigators/manualNavigator"
import { PanNavigator } from "./navigators/panNavigator"
import { observeState } from "./state"

export type NavigationEnhancerOutput = {
  navigation: {
    state$: ReturnType<typeof observeState>
    moveTo: PanNavigator["moveTo"]
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

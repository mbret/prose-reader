import {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { ManualNavigator } from "./navigators/manualNavigator"
import { PanNavigator } from "./navigators/panNavigator"
import { observeState } from "./state"
import { NavigationEnhancerOutput } from "./types"

export const navigationEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer>,
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

    const load: NavigationEnhancerOutput["load"] = (options) => {
      const { cfi, ...rest } = options

      reader.load(rest)

      if (cfi) {
        manualNavigator.goToCfi(cfi, { animate: false })
      }
    }

    return {
      ...reader,
      load,
      navigation: {
        ...reader.navigation,
        state$,
        moveTo: panNavigator.moveTo.bind(panNavigator),
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
      },
    }
  }

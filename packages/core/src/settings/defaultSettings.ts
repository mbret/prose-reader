import { Settings } from "./types"

export const defaultSettings: Settings = {
  forceSinglePageMode: false,
  pageTurnAnimation: `none`,
  //   computedPageTurnAnimation: `none`,
  pageTurnDirection: `horizontal`,
  //   computedPageTurnDirection: `horizontal`,
  pageTurnAnimationDuration: undefined,
  //   computedPageTurnAnimationDuration: 0,
  pageTurnMode: `controlled`,
  //   computedPageTurnMode: `controlled`,
  //   computedSnapAnimationDuration: 300,
  navigationSnapThreshold: 0.3,
  numberOfAdjacentSpineItemToPreLoad: 0,
}

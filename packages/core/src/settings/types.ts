export type Settings = {
  forceSinglePageMode: boolean
  pageTurnAnimation: `none` | `fade` | `slide`
  pageTurnAnimationDuration: undefined | number
  pageTurnDirection: `vertical` | `horizontal`
  pageTurnMode: `controlled` | `scrollable`
  navigationSnapThreshold: number
  /**
   * Specify how many spine items you want to preload.
   * Useful for pre-paginated where you want the user to have a smooth transition between items.
   *
   * @important
   * Be careful when using this option with reflowable books since it can potentially add some
   * heavy work on the CPU. One reflowable book with several big chapter may slow down your app
   * significantly.
   */
  numberOfAdjacentSpineItemToPreLoad: number
}

/**
 * Represent the settings that are derived from user settings.
 * Because some of the user settings can sometime be invalid based on some
 * context we need to use the computed one internally.
 * For example if the user decide to use horizontal page turn direction with scrolled content
 * we will overwrite it and force it to vertical (granted we only support vertical).
 */
export type ComputedSettings = Settings & {
  /**
   * controlled: viewport will move in a controlled way, moving from one page to another with calculated coordinate
   * scrollable: viewport will use a simple css overflow mecanism and let the user scroll through content
   */
  computedPageTurnMode: Settings[`pageTurnMode`]
  computedPageTurnDirection: Settings[`pageTurnDirection`]
  computedPageTurnAnimation: Settings[`pageTurnAnimation`]
  computedPageTurnAnimationDuration: number
  computedSnapAnimationDuration: number
}

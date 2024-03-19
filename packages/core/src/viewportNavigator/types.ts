import { SpineItem } from "../spineItem/createSpineItem"

export type LastUserExpectedNavigation =
  | undefined
  // always adjust at the first page
  | { type: `navigate-from-previous-item` }
  // always adjust at the last page
  | { type: `navigate-from-next-item` }
  // always adjust using this cfi
  | { type: `navigate-from-cfi`; data: string }
  // always adjust using this anchor
  | { type: `navigate-from-anchor`; data: string }

export type Navigation = {
  position: {
    x: number
    y: number
    spineItem?: SpineItem | undefined
  }
  triggeredBy: `scroll` | `manual` | `adjust`
  animation: false | `turn` | `snap`
  lastUserExpectedNavigation: LastUserExpectedNavigation
}

export type AdjustedNavigation = {
  previousNavigationPosition: {
    x: number
    y: number
  }
  adjustedSpinePosition: {
    x: number
    y: number
  }
  areDifferent: boolean
}

/**
 * Direction of a single page turn within the spine.
 *
 * `leftOrTop` moves toward the left (horizontal reading) or top (vertical
 * reading) page, `rightOrBottom` toward the right or bottom page.
 */
export type PageNavigationDirection = "leftOrTop" | "rightOrBottom"

/**
 * Sign applied to page-size deltas so a single implementation can resolve both
 * navigation directions. `leftOrTop` decreases the position, `rightOrBottom`
 * increases it.
 */
export const getPageNavigationDirectionSign = (
  direction: PageNavigationDirection,
): 1 | -1 => (direction === "rightOrBottom" ? 1 : -1)

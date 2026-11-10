import { expect, type Page } from "@playwright/test"
import { layOutAndSettle } from "./pagination"
import { getSpineItemIndexesOnScreen } from "./visibility"

export type PageTurnMode = "controlled" | "scrollable"

/**
 * Changes the page turn mode to each of `pageTurnModes` in turn. After each
 * change, once the reader has laid out again, it checks that the spine item
 * is still the only one on screen.
 */
export const expectSpineItemKeptThroughPageTurnModes = async (
  page: Page,
  spineItemIndex: number,
  pageTurnModes: PageTurnMode[],
) => {
  for (const [change, pageTurnMode] of pageTurnModes.entries()) {
    await layOutAndSettle(page, { settings: { pageTurnMode } })

    await expect
      .poll(
        () => getSpineItemIndexesOnScreen(page),
        `the pages on screen after change ${change + 1}, to ${pageTurnMode}`,
      )
      .toEqual([spineItemIndex])
  }
}

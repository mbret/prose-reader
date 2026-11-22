import { expect, type Page } from "@playwright/test"
import { readSettledPagination } from "./pagination"
import { getReader } from "./reader"

export type ScenarioWindow = {
  size: { width: number; height: number }
  pagesPerScreen: number
}

export const SINGLE_PAGE_WINDOW: ScenarioWindow = {
  size: { width: 600, height: 800 },
  pagesPerScreen: 1,
}

export const SPREAD_WINDOW: ScenarioWindow = {
  size: { width: 1200, height: 800 },
  pagesPerScreen: 2,
}

/** A spread whose pages are half a pixel wider than a whole pixel count. */
export const ODD_SPREAD_WINDOW: ScenarioWindow = {
  size: { width: 1201, height: 800 },
  pagesPerScreen: 2,
}

/**
 * Opens the scenario at `url` in a window of `size`, and checks that the
 * reader shows `pagesPerScreen` pages at a time once it has settled.
 */
export const openScenarioInWindow = async (
  page: Page,
  url: string,
  { size, pagesPerScreen }: ScenarioWindow,
) => {
  await page.setViewportSize(size)
  await page.goto(url)
  await readSettledPagination(page)

  const viewport = await (await getReader(page)).evaluate((reader) => ({
    isSpread: reader.viewport.value.isSpread,
    pageWidth: reader.viewport.value.pageSize.width,
  }))

  expect(viewport, `the window shows ${pagesPerScreen} page(s)`).toEqual({
    isSpread: pagesPerScreen === 2,
    pageWidth: size.width / pagesPerScreen,
  })
}

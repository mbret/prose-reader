import { expect, type Page } from "@playwright/test"
import { waitForSettled } from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import { test } from "../../utils/test"

const url = "http://localhost:3333/tests/navigation/scrubber/index.html"
const spreadWindowSize = { width: 1000, height: 600 }

/**
 * The spread the reader shows, counted from the start of the book as the
 * scrubber counts them, with the spine item it begins with, once the reader
 * has settled.
 */
const readSettledSpread = async (page: Page) => {
  const reader = await getReader(page)
  const handle = await page.waitForFunction((reader) => {
    const { isSettled, isUsingSpread, begin, numberOfTotalPages } =
      reader.pagination.state

    if (!isSettled || begin.absolutePageIndex === undefined) return undefined

    return {
      isUsingSpread,
      spreadIndex: Math.floor(begin.absolutePageIndex / 2),
      numberOfSpreads: Math.ceil(numberOfTotalPages / 2),
      spineItemIndex: begin.spineItemIndex,
      numberOfPagesInSpineItem: begin.numberOfPagesInSpineItem,
    }
  }, reader)
  const spread = await handle.jsonValue()

  if (!spread) throw new Error("no settled pagination result")

  return spread
}

/**
 * Clicks the scrubber's rail where it holds the spread at `spreadIndex`. The
 * book reads from right to left, so the rail starts at its right end.
 */
const clickScrubberAtSpread = async (
  page: Page,
  {
    spreadIndex,
    numberOfSpreads,
  }: { spreadIndex: number; numberOfSpreads: number },
) => {
  const railBox = await page.locator(".rc-slider-rail").boundingBox()

  if (!railBox) throw new Error("the scrubber is not shown")

  const fractionOfRailFromRightEnd = spreadIndex / (numberOfSpreads - 1)

  await page.mouse.click(
    railBox.x + railBox.width * (1 - fractionOfRailFromRightEnd),
    railBox.y + railBox.height / 2,
  )
}

const pollSettledSpreadIndex = (page: Page) =>
  expect.poll(async () => (await readSettledSpread(page)).spreadIndex)

test.describe("Given a pre-paginated book read from right to left in spreads", () => {
  test("the scrubber moves from the first spread, where the first page shares the spread with a blank page", async ({
    page,
  }) => {
    await page.setViewportSize(spreadWindowSize)
    await page.goto(url)
    await waitForSettled(page)

    const firstSpread = await readSettledSpread(page)

    expect(firstSpread).toMatchObject({
      isUsingSpread: true,
      spreadIndex: 0,
      spineItemIndex: 0,
      numberOfPagesInSpineItem: 2,
    })

    await clickScrubberAtSpread(page, {
      spreadIndex: 3,
      numberOfSpreads: firstSpread.numberOfSpreads,
    })

    await pollSettledSpreadIndex(page).toBe(3)
  })

  test("the scrubber moves back from the last spread, where the last page shares the spread with a blank page", async ({
    page,
  }) => {
    await page.setViewportSize(spreadWindowSize)
    await page.goto(url)
    await waitForSettled(page)

    const reader = await getReader(page)

    await reader.evaluate((reader) => {
      reader.navigation.goToSpineItem({
        indexOrId: reader.spineItemsManager.items.length - 1,
      })
    })

    const lastSpread = await readSettledSpread(page)

    expect(lastSpread).toMatchObject({
      isUsingSpread: true,
      spreadIndex: lastSpread.numberOfSpreads - 1,
      numberOfPagesInSpineItem: 2,
    })

    await clickScrubberAtSpread(page, {
      spreadIndex: 2,
      numberOfSpreads: lastSpread.numberOfSpreads,
    })

    await pollSettledSpreadIndex(page).toBe(2)
  })
})

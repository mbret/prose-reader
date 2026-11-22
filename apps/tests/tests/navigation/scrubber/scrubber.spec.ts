import { expect, type Page } from "@playwright/test"
import { navigateToSpineItem } from "../../utils"
import { readSettledPagination, waitForSettled } from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import { test } from "../../utils/test"

const url = "http://localhost:3333/tests/navigation/scrubber/index.html"
const spreadWindowSize = { width: 1000, height: 600 }

const getScrubber = (page: Page) => page.getByRole("slider")

/** The book reads from right to left, so the rail starts at its right end. */
const clickScrubberAtValue = async (page: Page, scrubberValue: number) => {
  const scrubberMaxValue = Number(
    await getScrubber(page).getAttribute("aria-valuemax"),
  )
  const railBox = await page.locator(".rc-slider-rail").boundingBox()

  if (!railBox) throw new Error("the scrubber is not shown")

  const fractionOfRailFromRightEnd = scrubberValue / scrubberMaxValue

  await page.mouse.click(
    railBox.x + railBox.width * (1 - fractionOfRailFromRightEnd),
    railBox.y + railBox.height / 2,
  )
}

const pollSettledSpineItemIndex = (page: Page) =>
  expect.poll(async () => (await readSettledPagination(page)).spineItemIndex)

/**
 * Each spread holds two items, except the first and the last, which hold one
 * item beside a blank page. Spread 2 begins with item 3, spread 3 with item 5.
 */
test.describe("Given a pre-paginated book read from right to left in spreads", () => {
  test("the scrubber moves from the first spread, where the first page shares the spread with a blank page", async ({
    page,
  }) => {
    await page.setViewportSize(spreadWindowSize)
    await page.goto(url)
    await waitForSettled(page)

    expect(await readSettledPagination(page)).toMatchObject({
      spineItemIndex: 0,
      numberOfPages: 2,
    })
    await expect(getScrubber(page)).toHaveAttribute("aria-valuenow", "0")
    await expect(getScrubber(page)).toHaveAttribute("aria-valuemax", "6")

    await clickScrubberAtValue(page, 3)

    await pollSettledSpineItemIndex(page).toBe(5)
    await expect(getScrubber(page)).toHaveAttribute("aria-valuenow", "3")
  })

  test("the scrubber moves back from the last spread, where the last page shares the spread with a blank page", async ({
    page,
  }) => {
    await page.setViewportSize(spreadWindowSize)
    await page.goto(url)
    await waitForSettled(page)

    const lastSpineItemIndex = await (await getReader(page)).evaluate(
      (reader) => reader.spineItemsManager.items.length - 1,
    )

    await navigateToSpineItem({ page, index: lastSpineItemIndex })

    expect(await readSettledPagination(page)).toMatchObject({
      spineItemIndex: lastSpineItemIndex,
      numberOfPages: 2,
    })
    await expect(getScrubber(page)).toHaveAttribute("aria-valuenow", "6")

    await clickScrubberAtValue(page, 2)

    await pollSettledSpineItemIndex(page).toBe(3)
    await expect(getScrubber(page)).toHaveAttribute("aria-valuenow", "2")
  })
})

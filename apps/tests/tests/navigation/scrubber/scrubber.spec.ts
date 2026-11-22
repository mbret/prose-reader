import { expect, type Page } from "@playwright/test"
import { getLongChapterIndex, navigateToSpineItem } from "../../utils"
import { readSettledPagination, waitForSettled } from "../../utils/pagination"
import { test } from "../../utils/test"

const scenarioUrl = "http://localhost:3333/tests/navigation/scrubber/index.html"
const spreadWindowSize = { width: 1000, height: 600 }
const singlePageWindowSize = { width: 600, height: 800 }

type RailStart = "left" | "right"

const getScrubber = (page: Page) => page.getByRole("slider")

/** In a book read from right to left, the rail starts at its right end. */
const getPositionOfScrubberValueOnRail = async (
  page: Page,
  { scrubberValue, railStart }: { scrubberValue: number; railStart: RailStart },
) => {
  const scrubberMaxValue = Number(
    await getScrubber(page).getAttribute("aria-valuemax"),
  )
  const railBox = await page.locator(".rc-slider-rail").boundingBox()

  if (!railBox) throw new Error("the scrubber is not shown")

  const fractionOfRailFromItsStart = scrubberValue / scrubberMaxValue
  const fractionOfRailFromLeftEnd =
    railStart === "left"
      ? fractionOfRailFromItsStart
      : 1 - fractionOfRailFromItsStart

  return {
    x: railBox.x + railBox.width * fractionOfRailFromLeftEnd,
    y: railBox.y + railBox.height / 2,
  }
}

const clickScrubberAtValue = async (
  page: Page,
  target: { scrubberValue: number; railStart: RailStart },
) => {
  const { x, y } = await getPositionOfScrubberValueOnRail(page, target)

  await page.mouse.click(x, y)
}

/** Moves the pointer in steps, so the scrubber passes the values between. */
const dragScrubberToValue = async (
  page: Page,
  target: { scrubberValue: number; railStart: RailStart },
) => {
  const handleBox = await getScrubber(page).boundingBox()

  if (!handleBox) throw new Error("the scrubber is not shown")

  const { x, y } = await getPositionOfScrubberValueOnRail(page, target)

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(x, y, { steps: 10 })
  await page.mouse.up()
}

const pollSettledSpineItemIndex = (page: Page) =>
  expect.poll(async () => (await readSettledPagination(page)).spineItemIndex)

/**
 * Spreads 0, 2, 3 and 7 each hold one item beside a blank page. Spread 4
 * begins with item 5, spread 5 with item 7 and spread 6 with item 9.
 */
test.describe("Given a pre-paginated book read from right to left in spreads", () => {
  const openBookInSpreads = async (page: Page) => {
    await page.setViewportSize(spreadWindowSize)
    await page.goto(`${scenarioUrl}?book=pre-paginated-rtl`)
    await waitForSettled(page)
  }

  for (const {
    spreadName,
    spineItemIndex,
    scrubberValue,
    targetScrubberValue,
    targetSpineItemIndex,
  } of [
    {
      spreadName: "first",
      spineItemIndex: 0,
      scrubberValue: 0,
      targetScrubberValue: 4,
      targetSpineItemIndex: 5,
    },
    {
      spreadName: "third",
      spineItemIndex: 3,
      scrubberValue: 2,
      targetScrubberValue: 6,
      targetSpineItemIndex: 9,
    },
    {
      spreadName: "last",
      spineItemIndex: 11,
      scrubberValue: 7,
      targetScrubberValue: 5,
      targetSpineItemIndex: 7,
    },
  ]) {
    test(`the scrubber moves from the ${spreadName} spread, where a page shares the spread with a blank page`, async ({
      page,
    }) => {
      await openBookInSpreads(page)
      await navigateToSpineItem({ page, index: spineItemIndex })

      expect(await readSettledPagination(page)).toMatchObject({
        spineItemIndex,
        numberOfPages: 2,
      })
      await expect(getScrubber(page)).toHaveAttribute("aria-valuemax", "7")
      await expect(getScrubber(page)).toHaveAttribute(
        "aria-valuenow",
        String(scrubberValue),
      )

      await clickScrubberAtValue(page, {
        scrubberValue: targetScrubberValue,
        railStart: "right",
      })

      await pollSettledSpineItemIndex(page).toBe(targetSpineItemIndex)
      await expect(getScrubber(page)).toHaveAttribute(
        "aria-valuenow",
        String(targetScrubberValue),
      )
    })
  }

  test("a drag of the scrubber from the first spread takes the reader to the spread where the drag ends", async ({
    page,
  }) => {
    await openBookInSpreads(page)

    expect(await readSettledPagination(page)).toMatchObject({
      spineItemIndex: 0,
      numberOfPages: 2,
    })

    await dragScrubberToValue(page, { scrubberValue: 5, railStart: "right" })

    await pollSettledSpineItemIndex(page).toBe(7)
    await expect(getScrubber(page)).toHaveAttribute("aria-valuenow", "5")
  })
})

test.describe("Given a reflowable book with chapters, read from left to right one page at a time", () => {
  test("the scrubber moves through the pages of the chapter in view", async ({
    page,
  }) => {
    await page.setViewportSize(singlePageWindowSize)
    await page.goto(`${scenarioUrl}?book=reflowable-with-chapters`)
    await waitForSettled(page)

    const chapterIndex = await getLongChapterIndex(page)

    await navigateToSpineItem({ page, index: chapterIndex })

    const { numberOfPages } = await readSettledPagination(page)

    expect(numberOfPages).toBeGreaterThan(3)
    await expect(getScrubber(page)).toHaveAttribute(
      "aria-valuemax",
      String(numberOfPages - 1),
    )
    await expect(getScrubber(page)).toHaveAttribute("aria-valuenow", "0")

    await clickScrubberAtValue(page, { scrubberValue: 3, railStart: "left" })

    await expect
      .poll(() => readSettledPagination(page))
      .toMatchObject({ spineItemIndex: chapterIndex, beginPageIndex: 3 })
    await expect(getScrubber(page)).toHaveAttribute("aria-valuenow", "3")
  })
})

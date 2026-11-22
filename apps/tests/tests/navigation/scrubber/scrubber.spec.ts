import { expect, type Page } from "@playwright/test"
import { goToLongChapter, navigateToSpineItem } from "../../utils"
import { readSettledPagination } from "../../utils/pagination"
import { test } from "../../utils/test"
import {
  openScenarioInWindow,
  type ScenarioWindow,
  SINGLE_PAGE_WINDOW,
  SPREAD_WINDOW,
} from "../../utils/windows"
import type { ScrubberBook } from "./scrubberBooks"

const scenarioUrl = "http://localhost:3333/tests/navigation/scrubber/index.html"

/** In a book read from right to left, the rail starts at its right end. */
type RailStart = "left" | "right"

const SCRUBBER_SCENARIOS = {
  "pre-paginated-rtl": { window: SPREAD_WINDOW, railStart: "right" },
  "reflowable-with-chapters": { window: SINGLE_PAGE_WINDOW, railStart: "left" },
} satisfies Record<
  ScrubberBook,
  { window: ScenarioWindow; railStart: RailStart }
>

type ScrubberTarget = { book: ScrubberBook; scrubberValue: number }

const openScrubberScenario = (page: Page, book: ScrubberBook) =>
  openScenarioInWindow(
    page,
    `${scenarioUrl}?book=${book}`,
    SCRUBBER_SCENARIOS[book].window,
  )

const getScrubber = (page: Page) => page.getByRole("slider")

const getPositionOfScrubberValueOnRail = async (
  page: Page,
  { book, scrubberValue }: ScrubberTarget,
) => {
  const scrubberMaxValue = Number(
    await getScrubber(page).getAttribute("aria-valuemax"),
  )
  const railBox = await page.locator(".rc-slider-rail").boundingBox()

  if (!railBox) throw new Error("the scrubber is not shown")

  const fractionOfRailFromItsStart = scrubberValue / scrubberMaxValue
  const fractionOfRailFromLeftEnd =
    SCRUBBER_SCENARIOS[book].railStart === "left"
      ? fractionOfRailFromItsStart
      : 1 - fractionOfRailFromItsStart

  return {
    x: railBox.x + railBox.width * fractionOfRailFromLeftEnd,
    y: railBox.y + railBox.height / 2,
  }
}

const clickScrubberAtValue = async (page: Page, target: ScrubberTarget) => {
  const { x, y } = await getPositionOfScrubberValueOnRail(page, target)

  await page.mouse.click(x, y)
}

const pressScrubberHandle = async (page: Page) => {
  const handleBox = await getScrubber(page).boundingBox()

  if (!handleBox) throw new Error("the scrubber is not shown")

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  )
  await page.mouse.down()
}

/** Moves the pointer in steps, so the scrubber passes the values between. */
const movePointerToScrubberValue = async (
  page: Page,
  target: ScrubberTarget,
) => {
  const { x, y } = await getPositionOfScrubberValueOnRail(page, target)

  await page.mouse.move(x, y, { steps: 5 })
}

const NUMBER_OF_PAGES_OF_ITEM_BESIDE_BLANK_PAGE = 2
const LAST_SPREAD_SCRUBBER_VALUE = 7

/**
 * At scrubber values 0, 2, 3 and 7, a spread holds items 0, 3, 4 and 11, each
 * beside a blank page. At values 4, 5 and 6, it begins with items 5, 7 and 9.
 */
test.describe("Given a pre-paginated book read from right to left in spreads", () => {
  const book = "pre-paginated-rtl"

  for (const {
    spreadName,
    startSpineItemIndex,
    startScrubberValue,
    targetScrubberValue,
    targetSpineItemIndex,
  } of [
    {
      spreadName: "first",
      startSpineItemIndex: 0,
      startScrubberValue: 0,
      targetScrubberValue: 4,
      targetSpineItemIndex: 5,
    },
    {
      spreadName: "third",
      startSpineItemIndex: 3,
      startScrubberValue: 2,
      targetScrubberValue: 6,
      targetSpineItemIndex: 9,
    },
    {
      spreadName: "last",
      startSpineItemIndex: 11,
      startScrubberValue: LAST_SPREAD_SCRUBBER_VALUE,
      targetScrubberValue: 5,
      targetSpineItemIndex: 7,
    },
  ]) {
    test(`the scrubber moves from the ${spreadName} spread, where a page shares the spread with a blank page`, async ({
      page,
    }) => {
      await openScrubberScenario(page, book)
      await navigateToSpineItem({ page, index: startSpineItemIndex })

      expect(await readSettledPagination(page)).toMatchObject({
        spineItemIndex: startSpineItemIndex,
        numberOfPages: NUMBER_OF_PAGES_OF_ITEM_BESIDE_BLANK_PAGE,
      })
      await expect(getScrubber(page)).toHaveAttribute(
        "aria-valuemax",
        String(LAST_SPREAD_SCRUBBER_VALUE),
      )
      await expect(getScrubber(page)).toHaveAttribute(
        "aria-valuenow",
        String(startScrubberValue),
      )

      await clickScrubberAtValue(page, {
        book,
        scrubberValue: targetScrubberValue,
      })

      await expect
        .poll(() => readSettledPagination(page))
        .toMatchObject({ spineItemIndex: targetSpineItemIndex })
      await expect(getScrubber(page)).toHaveAttribute(
        "aria-valuenow",
        String(targetScrubberValue),
      )
    })
  }

  test("a drag of the scrubber from the first spread takes the reader along, to the spread where the drag ends", async ({
    page,
  }) => {
    await openScrubberScenario(page, book)

    expect(await readSettledPagination(page)).toMatchObject({
      spineItemIndex: 0,
    })

    await pressScrubberHandle(page)
    await movePointerToScrubberValue(page, { book, scrubberValue: 2 })

    await expect(getScrubber(page)).toHaveAttribute("aria-valuenow", "2")
    await expect
      .poll(() => readSettledPagination(page))
      .toMatchObject({ spineItemIndex: 3 })

    await movePointerToScrubberValue(page, { book, scrubberValue: 5 })
    await page.mouse.up()

    await expect
      .poll(() => readSettledPagination(page))
      .toMatchObject({ spineItemIndex: 7 })
    await expect(getScrubber(page)).toHaveAttribute("aria-valuenow", "5")
  })
})

test.describe("Given a reflowable book with chapters, read from left to right one page at a time", () => {
  test("the scrubber moves through the pages of the chapter in view", async ({
    page,
  }) => {
    const book = "reflowable-with-chapters"
    const targetPageIndex = 3

    await openScrubberScenario(page, book)

    const { chapterIndex, numberOfPages } = await goToLongChapter(page)

    await expect(getScrubber(page)).toHaveAttribute(
      "aria-valuemax",
      String(numberOfPages - 1),
    )
    await expect(getScrubber(page)).toHaveAttribute("aria-valuenow", "0")

    await clickScrubberAtValue(page, { book, scrubberValue: targetPageIndex })

    await expect
      .poll(() => readSettledPagination(page))
      .toMatchObject({
        spineItemIndex: chapterIndex,
        beginPageIndex: targetPageIndex,
      })
    await expect(getScrubber(page)).toHaveAttribute(
      "aria-valuenow",
      String(targetPageIndex),
    )
  })
})

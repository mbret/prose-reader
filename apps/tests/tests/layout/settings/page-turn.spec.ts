import { expect, type Page, test } from "@playwright/test"
import { locateSpineItems, updateSettings } from "../../utils"
import { waitForSettled } from "../../utils/pagination"

// the precision toBeCloseTo checks with by default
const isCloseTo = (a: number, b: number) => Math.abs(a - b) < 0.005

/**
 * Where the second page sits against the first. The two arrangements exclude
 * each other, so polling for the new one after a setting change cannot be met
 * by what was on screen before it.
 */
const arrangementOfTheFirstTwoPages = async (page: Page) => {
  const items = await locateSpineItems({
    page,
    indexes: [0, 1],
    isReady: false,
  })
  const [first, second] = await Promise.all(
    items.map((item) => item.boundingBox()),
  )

  if (!first || !second) throw new Error("a page has no box")

  if (
    isCloseTo(second.x, first.x + first.width) &&
    isCloseTo(second.y, first.y)
  ) {
    return "side by side"
  }

  if (
    isCloseTo(second.x, first.x) &&
    isCloseTo(second.y, first.y + first.height)
  ) {
    return "stacked"
  }

  return `neither: ${JSON.stringify({ first, second })}`
}

const settingsThatStackThePages: {
  change: string
  settings: Parameters<typeof updateSettings>[0]["settings"]
}[] = [
  {
    change: "the page turn direction becomes vertical",
    settings: { pageTurnDirection: "vertical" },
  },
  {
    change: "scrolling is turned on",
    settings: { pageTurnMode: "scrollable" },
  },
]

test.describe("Given a book whose pages sit side by side", () => {
  for (const { change, settings } of settingsThatStackThePages) {
    test.describe(`When ${change}`, () => {
      test("Then the reader lays out again and the second page is below the first", async ({
        page,
      }) => {
        await page.setViewportSize({ width: 300, height: 600 })
        await page.goto(
          `http://localhost:3333/tests/layout/settings/index.html`,
        )
        await waitForSettled(page)

        expect(await arrangementOfTheFirstTwoPages(page)).toBe("side by side")

        await updateSettings({ page, settings })

        await expect
          .poll(() => arrangementOfTheFirstTwoPages(page))
          .toBe("stacked")
      })
    })
  }
})

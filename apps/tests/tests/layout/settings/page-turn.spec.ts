import { expect, type Page, test } from "@playwright/test"
import { locateSpineItems } from "../../utils"
import { updateSettingsAndSettle, waitForSettled } from "../../utils/pagination"

const boxesOfTheFirstTwoPages = async (page: Page) => {
  const items = await locateSpineItems({
    page,
    indexes: [0, 1],
    isReady: false,
  })
  const [first, second] = await Promise.all(
    items.map((item) => item.boundingBox()),
  )

  if (!first || !second) throw new Error("a page has no box")

  return { first, second }
}

const settingsThatStackThePages: {
  change: string
  settings: Parameters<typeof updateSettingsAndSettle>[1]
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

        const before = await boxesOfTheFirstTwoPages(page)

        expect(before.second.x).toBeCloseTo(before.first.x + before.first.width)
        expect(before.second.y).toBeCloseTo(before.first.y)

        await updateSettingsAndSettle(page, settings)

        const after = await boxesOfTheFirstTwoPages(page)

        expect(after.second.x).toBeCloseTo(after.first.x)
        expect(after.second.y).toBeCloseTo(after.first.y + after.first.height)
      })
    })
  }
})

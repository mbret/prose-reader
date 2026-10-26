import { expect, test } from "@playwright/test"
import { waitForSettled } from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/**
 * The locator sets up once the browser is idle, so a reader destroyed right
 * after a resource is located is destroyed before the locator starts.
 */
test.describe("Given a resource located on a reader destroyed right away", () => {
  test("its result completes as the reader is destroyed", async ({ page }) => {
    await page.goto(url)
    await waitForSettled(page)

    const locateResult = await (await getReader(page)).evaluate((reader) => {
      const item = reader.spineItemsManager.get(1)

      if (!item) return "the book has no second item"

      let isComplete = false

      reader.locateResource(item).subscribe({
        complete: () => {
          isComplete = true
        },
      })
      reader.destroy()

      return isComplete ? "complete" : "still open"
    })

    expect(locateResult).toBe("complete")
  })
})

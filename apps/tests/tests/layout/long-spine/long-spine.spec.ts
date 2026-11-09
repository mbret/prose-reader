import { expect, test } from "@playwright/test"
import { LONG_COMIC_NUMBER_OF_PAGES } from "../../../server/serveBooks"
import { navigateToSpineItem } from "../../utils"
import { waitForSettled } from "../../utils/pagination"
import { getReader } from "../../utils/reader"

const url = "http://localhost:3333/tests/layout/long-spine/index.html"

test.describe(`Given a comic of ${LONG_COMIC_NUMBER_OF_PAGES} pages, one spine item each`, () => {
  test("should lay every page out, and show the last one", async ({ page }) => {
    await page.goto(url)

    const reader = await getReader(page)
    const lastIndex = LONG_COMIC_NUMBER_OF_PAGES - 1

    expect(
      await reader.evaluate((reader) => reader.spineItemsManager.items.length),
    ).toBe(LONG_COMIC_NUMBER_OF_PAGES)

    await expect
      .poll(
        () =>
          reader.evaluate(
            (reader, lastIndex) =>
              reader.spine.getSpineItemSpineLayoutInfo(lastIndex).width,
            lastIndex,
          ),
        { message: "the width the layout gives the last page" },
      )
      .toBeGreaterThan(0)

    await navigateToSpineItem({ page, index: lastIndex })
    await waitForSettled(page)

    // A spread's last page, when the screen shows two
    expect(
      await reader.evaluate(
        (reader) => reader.pagination.state.end.spineItemIndex,
      ),
      "the last spine item on screen",
    ).toBe(lastIndex)
  })
})

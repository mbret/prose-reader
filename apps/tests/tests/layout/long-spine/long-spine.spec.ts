import { expect, test } from "@playwright/test"
import { LONG_COMIC_NUMBER_OF_PAGES } from "../../../server/longComic"
import { expectSpineItemsInViewport, navigateToSpineItem } from "../../utils"
import { waitForSettledOnCurrentLayout } from "../../utils/pagination"
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
    await expectSpineItemsInViewport({ page, indexes: [lastIndex] })
  })

  test("should lay out once every page whose load never started, from the mount until no page is loading", async ({
    page,
  }) => {
    await page.goto(url)

    const reader = await getReader(page)

    await waitForSettledOnCurrentLayout(page)
    await page.waitForFunction(
      (reader) =>
        reader.spine.isLayoutCurrent() &&
        reader.spineItemsManager.items.every(
          ({ value }) => value.loadStatus !== "loading",
        ),
      reader,
    )

    const pagesFromMount = await page.evaluate(
      () =>
        // The window is untyped: the scenario's index.tsx sets it.
        (
          window as unknown as {
            pagesFromMount: { layouts: number; hasStartedLoading: boolean }[]
          }
        ).pagesFromMount,
    )
    const pagesLoaded = pagesFromMount.filter(
      ({ hasStartedLoading }) => hasStartedLoading,
    )

    // Preconditions: the pages around the first one loaded, and the others
    // did not.
    expect(pagesLoaded.length, "the pages loaded").toBeGreaterThan(0)
    expect(pagesLoaded.length, "the pages loaded").toBeLessThan(
      LONG_COMIC_NUMBER_OF_PAGES,
    )

    /**
     * A page keeps its size when its image loads: the pages after it stay
     * where the first layout put them, and nothing lays them out again.
     */
    expect(
      pagesFromMount
        .map(({ layouts, hasStartedLoading }, index) => ({
          index,
          layouts,
          hasStartedLoading,
        }))
        .filter(
          ({ layouts, hasStartedLoading }) =>
            !hasStartedLoading && layouts !== 1,
        ),
      "the pages never loaded, laid out other than once",
    ).toEqual([])
  })
})

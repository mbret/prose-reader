import { expect } from "@playwright/test"
import { LONG_COMIC_NUMBER_OF_PAGES } from "../../../server/longComic"
import { expectSpineItemsInViewport, navigateToSpineItem } from "../../utils"
import { waitForSettledOnCurrentLayout } from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import { test } from "../../utils/test"

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
    const pageIndexesWhoseLoadStarted = pagesFromMount.flatMap(
      ({ hasStartedLoading }, index) => (hasStartedLoading ? [index] : []),
    )
    const pagesNeverLoaded = pagesFromMount
      .map(({ layouts, hasStartedLoading }, index) => ({
        index,
        layouts,
        hasStartedLoading,
      }))
      .filter(({ hasStartedLoading }) => !hasStartedLoading)

    /**
     * Precondition: a page whose load never started comes after one whose
     * load did, so a layout of the pages after that one would reach it.
     */
    expect(
      pageIndexesWhoseLoadStarted.length,
      "the pages whose load started",
    ).toBeGreaterThan(0)
    expect(
      Math.max(...pagesNeverLoaded.map(({ index }) => index)),
      "the last page whose load never started",
    ).toBeGreaterThan(Math.min(...pageIndexesWhoseLoadStarted))

    /**
     * A page keeps its size when its image loads: the pages after it stay
     * where the first layout put them, and nothing lays them out again.
     */
    expect(
      pagesNeverLoaded
        .filter(({ layouts }) => layouts !== 1)
        .map(({ index, layouts }) => ({ index, layouts })),
      "the pages whose load never started, laid out other than once",
    ).toEqual([])
  })
})

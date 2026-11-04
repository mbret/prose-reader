import { expect, test } from "@playwright/test"
import { resizeAndSettle } from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"
import { isCfiPositionVisible } from "../../../utils/visibility"

test.describe("Given a CFI", () => {
  test("should open on the page holding it, the second of its item", async ({
    page,
  }) => {
    await page.setViewportSize({
      width: 536,
      height: 842,
    })

    const tableOfContentsSpineItemIndex = 3
    /**
     * "Timed Tracks", in the table of contents. In the book's own font it is
     * the first entry of the second page, and in the fallback font of the
     * Linux builds the last of the first: the page it opens on is only right
     * once the table of contents is laid out in its own font.
     */
    const cfi = `epubcfi(/6/${(tableOfContentsSpineItemIndex + 1) * 2}!/2/4/4[toc]/4/8/4/2/4/2/2/1)`

    await page.goto(
      `http://localhost:3333/tests/navigation/restoration/epub/index.html?cfi=${encodeURIComponent(cfi)}`,
    )

    const reader = await getReader(page)

    // A cfi naming only its item would open on the item's first page.
    expect(
      await reader.evaluate(
        (reader, cfi) => ({
          isRootCfi: reader.cfi.isRootCfi(cfi),
          itemIndex: reader.cfi.parseCfi(cfi).itemIndex,
        }),
        cfi,
      ),
    ).toEqual({ isRootCfi: false, itemIndex: tableOfContentsSpineItemIndex })

    // Its character in view alone could be the first page's, before the font
    // that moves it to the second is in.
    await expect
      .poll(async () => ({
        ...(await reader.evaluate((reader) => ({
          isSettled: reader.pagination.state.isSettled,
          spineItemIndex: reader.pagination.state.begin.spineItemIndex,
          pageIndex: reader.pagination.state.begin.pageIndexInSpineItem,
        }))),
        isCfiVisible: await isCfiPositionVisible(page, cfi),
      }))
      .toEqual({
        isSettled: true,
        spineItemIndex: tableOfContentsSpineItemIndex,
        pageIndex: 1,
        isCfiVisible: true,
      })
  })
})

test.describe("Given CFI in the middle of book", () => {
  test.describe("and the window is shrunked", () => {
    /**
     * @note This test was asserting a bug where I forgot to "reset" the last known dimensions
     * of the spine item when its not loaded. Going into smaller pageSize, the same spineIte was returning
     * undefined dims and we were using the same previous one (for bigger pageSize). Resulting in an invalid
     * spine item width for the given pageSize. The spine item layout was messed up and calculation were wrong
     * for locators.
     */
    test("should restore navigation back to the same page", async ({
      page,
    }) => {
      await page.setViewportSize({
        width: 690,
        height: 1294,
      })

      // safari books online chapter
      const cfi = `epubcfi(/6/${(6 + 1) * 2}!/2/4/2/2[I_sect1_d1e191]/1)`

      await page.goto(
        `http://localhost:3333/tests/navigation/restoration/epub/index.html?cfi=${encodeURIComponent(cfi)}`,
      )

      const frameHandle = page.locator(".spineItem:nth-child(7) iframe")
      const frame = frameHandle.contentFrame()
      const textElement = frame?.getByText("Safari® Books Online")

      await textElement?.waitFor({ state: "visible" })
      await expect(textElement).toBeInViewport({
        ratio: 1,
      })

      // these sizes are chosen mostly because they are not even.
      await resizeAndSettle(page, {
        width: 375,
        height: 667,
      })

      // Restoration is a navigation of its own, so the assertion polls.
      await expect(textElement).toBeInViewport({
        ratio: 1,
      })
    })
  })
})

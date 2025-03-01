import { expect, test } from "@playwright/test"

test.describe("Given a CFI", () => {
  test("should navigate correct second page", async ({ page }) => {
    await page.setViewportSize({
      width: 536,
      height: 842,
    })

    const cfi = `epubcfi(/2/4/4[toc]/4/8/4/2/4/2/2/1|[prose~anchor~3]|[prose~offset~0])`

    await page.goto(
      `http://localhost:3333/tests/navigation/restoration/epub/index.html?cfi=${encodeURIComponent(cfi)}`,
    )

    // TOC
    const frameHandle = page.locator(".spineItem:nth-child(4) iframe")
    const frame = frameHandle.contentFrame()

    const textElement = frame?.getByText("About the Book")
    await textElement?.waitFor({ state: "visible" })

    await expect(textElement).toBeInViewport({
      ratio: 1,
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
      const cfi = `epubcfi(/2/4/2/2[I_sect1_d1e191]/1|[prose~anchor~6]|[prose~offset~0])`

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
      await page.setViewportSize({
        width: 375,
        height: 667,
      })

      // it's hard to know exactly when layout + restoration is done and test it correctly.
      // so we just wait 1 second which should be largely enough
      await page.waitForTimeout(1000)

      await textElement?.waitFor({ state: "visible" })
      await expect(textElement).toBeInViewport({
        ratio: 1,
      })
    })
  })
})

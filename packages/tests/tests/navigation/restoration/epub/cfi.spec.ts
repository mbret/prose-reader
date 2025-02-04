import { expect, test } from "@playwright/test"

test.describe("asd", () => {
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

    await expect(textElement).toBeInViewport()
  })
})

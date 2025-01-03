import { test, expect } from "@playwright/test"

test.describe("Given a prepaginated book with first page on spread right", () => {
  test("should render first document on right page", async ({ page }) => {
    await page.setViewportSize({
      width: 400,
      height: 300,
    })

    await page.goto("http://localhost:3333/tests/prepaginated/index.html")

    await page.waitForSelector(".prose-spineItem-ready")

    expect(await page.screenshot()).toMatchSnapshot(`page-spread-right.png`)
  })
})

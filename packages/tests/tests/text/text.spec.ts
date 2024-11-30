import { test, expect } from "@playwright/test"

test("should display basic text", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/text/index.html")

  // wait for first item to be ready
  await page.waitForSelector(".prose-spineItem-ready")

  expect(await page.screenshot()).toMatchSnapshot(`text.png`)
})

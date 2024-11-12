import { test, expect } from "@playwright/test"

test("should display basic text", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/text/index.html")

  await page.waitForTimeout(500)

  expect(await page.screenshot()).toMatchSnapshot(`text.png`)
})

import { expect, test } from "@playwright/test"
import { waitForSpineItemReady } from "../utils"

test("should display basic text", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/text/index.html")

  await waitForSpineItemReady(page, [0])

  expect(await page.screenshot()).toMatchSnapshot(`text.png`)
})

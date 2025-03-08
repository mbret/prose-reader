import { expect, test } from "@playwright/test"
import { locateSpineItems } from "../../utils"

test("first spine item should have correct width and height", async ({
  page,
}) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

  const spineItems = await locateSpineItems({
    page,
    indexes: [0],
  })
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  const spineItem1 = spineItems[0]!

  await spineItem1.waitFor({ state: "visible" })

  const boundingBox = await spineItem1.boundingBox()
  expect(boundingBox).not.toBeNull()
  expect(boundingBox?.width).toBe(300)
  expect(boundingBox?.height).toBe(1306)
})

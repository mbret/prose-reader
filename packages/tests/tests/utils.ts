import { type Page, expect } from "@playwright/test"

export async function waitForSpineItemReady(page: Page, indexes: number[]) {
  for (const index of indexes) {
    await page.waitForSelector(
      `.spineItem:nth-child(${index + 1})[data-is-ready="true"]`,
      {
        state: "visible",
      },
    )
  }
}

export async function locateSpineItems({
  indexes,
  page,
  isReady = true,
}: {
  page: Page
  indexes: number[]
  isReady?: boolean
}) {
  const spineItems = []

  for (const index of indexes) {
    const spineItem = page.locator(
      `.spineItem:nth-child(${index + 1})${isReady ? "[data-is-ready='true']" : ""}`,
    )
    spineItems.push(spineItem)
  }

  return spineItems
}

export const expectSpineItemsInViewport = async ({
  page,
  indexes,
}: {
  page: Page
  indexes: number[]
}) => {
  const spineItems = await locateSpineItems({ page, indexes, isReady: true })

  for (let index = 0; index < indexes.length; index++) {
    const spineItem = spineItems[index]

    await spineItem?.waitFor({ state: "visible" })
  }

  for (let index = 0; index < indexes.length; index++) {
    const spineItem = spineItems[index]

    if (!spineItem) throw new Error(`Spine item not found`)

    await expect(spineItem).toBeInViewport({
      ratio: 1,
    })
  }
}

export const turnRight = async ({ page }: { page: Page }) => {
  await page.keyboard.press("ArrowRight")
}

export const turnLeft = async ({ page }: { page: Page }) => {
  await page.keyboard.press("ArrowLeft")
}

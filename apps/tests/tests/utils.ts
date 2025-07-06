import { expect, type Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"

export async function waitForSpineItemReady(page: Page, indexes: number[]) {
  for (const index of indexes) {
    await page.waitForSelector(
      `.spineItem:nth-child(${index + 1})[data-is-ready="true"][data-is-dirty="false"]`,
      {
        state: "visible",
      },
    )
  }
}

export async function waitForSpineItemUnloaded(page: Page, indexes: number[]) {
  for (const index of indexes) {
    await page.waitForSelector(
      `.spineItem:nth-child(${index + 1})[data-is-ready="false"][data-is-dirty="false"]`,
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

export const navigateToSpineItem = async ({
  page,
  index,
}: {
  page: Page
  index: number
}) => {
  await page.evaluate(
    ([indexOrId = 0]) => {
      // @ts-ignore
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    },
    [index],
  )
}
export const getScrollNavigationMetadata = async ({ page }: { page: Page }) => {
  return await page.evaluate(() => {
    // @ts-ignore
    const reader = window.reader as Reader

    const navigatorElement =
      reader.navigation.scrollNavigationController.value.element
    const scrollLeft =
      reader.navigation.scrollNavigationController.value.element?.scrollLeft
    const scrollTop =
      reader.navigation.scrollNavigationController.value.element?.scrollTop

    if (!navigatorElement) {
      throw new Error("Navigator element not found")
    }

    const scrollbarWidth =
      navigatorElement.offsetWidth - navigatorElement.clientWidth

    return { scrollLeft, scrollbarWidth, scrollTop }
  })
}

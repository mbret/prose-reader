import { expect, type Page } from "@playwright/test"
import type {
  NavigationTarget,
  Reader,
  UserNavigationEntry,
} from "@prose-reader/core"
import { getReader } from "./reader"

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

export async function locateSpineItemFrame(page: Page, index: number) {
  const [spineItem] = await locateSpineItems({ page, indexes: [index] })

  if (!spineItem) throw new Error(`Spine item not found`)

  return spineItem.locator("iframe").first()
}

export const expectSpineItemsInViewport = async ({
  page,
  indexes,
  ratio = 1,
}: {
  page: Page
  indexes: number[]
  ratio?: number
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
      ratio,
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
  const reader = await getReader(page)

  await reader.evaluate((reader, indexOrId) => {
    reader.navigation.goToSpineItem({ indexOrId })
  }, index)
}

/**
 * Goes to the next spine item, whichever way the book reads: a comic reads
 * right to left unless it says otherwise.
 */
export const goToNextSpineItem = async ({ page }: { page: Page }) => {
  const reader = await getReader(page)

  await reader.evaluate((reader) => {
    reader.navigation.goToNextSpineItem()
  })
}

export const navigateTo = async ({
  navigation,
  page,
}: {
  // A selector target holds a function, which cannot be sent into the page.
  navigation: UserNavigationEntry<
    NavigationTarget<"position" | "spineItem" | "cfi">
  >
  page: Page
}) => {
  const reader = await getReader(page)

  await reader.evaluate((reader, navigation) => {
    reader.navigation.navigate(navigation)
  }, navigation)
}

export const updateSettings = async ({
  page,
  settings,
}: {
  page: Page
  // functions cannot be sent into the page
  settings: Omit<
    Parameters<Reader["settings"]["update"]>[0],
    "getResource" | "getRenderer"
  >
}) => {
  const reader = await getReader(page)

  await reader.evaluate((reader, settings) => {
    reader.settings.update(settings)
  }, settings)
}

/** Enters zoom and scales the book to `scale`. */
export const zoomAt = async ({
  page,
  scale,
}: {
  page: Page
  scale: number
}) => {
  const reader = await getReader(page)

  await reader.evaluate((reader, scale) => {
    reader.zoom.enter()
    reader.zoom.scaleAt(scale)
  }, scale)
}

export const getScrollNavigationMetadata = async ({ page }: { page: Page }) => {
  const reader = await getReader(page)

  return await reader.evaluate((reader) => {
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

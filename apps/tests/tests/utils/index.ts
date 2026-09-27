import { expect, type Page } from "@playwright/test"
import type {
  NavigationTarget,
  Reader,
  UserNavigationEntry,
} from "@prose-reader/core"
import {
  DOCUMENT_PROTOCOL_BY_RESOURCE_LOADING,
  type ResourceLoading,
} from "./resourceLoading"

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
  await page.evaluate(
    ([indexOrId = 0]) => {
      // @ts-expect-error
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    },
    [index],
  )
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
  await page.evaluate(
    ([navigation]) => {
      if (!navigation) return

      // @ts-expect-error
      const reader = window.reader as Reader

      reader.navigation.navigate(navigation)
    },
    [navigation],
  )
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
  await page.evaluate((settings) => {
    // @ts-expect-error window.reader is set by the scenario's index.tsx
    const reader = window.reader as Reader

    reader.settings.update(settings)
  }, settings)
}

export const getScrollNavigationMetadata = async ({ page }: { page: Page }) => {
  return await page.evaluate(() => {
    // @ts-expect-error
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

/** The protocol of each loaded spine item's document, as it came in. */
const getLoadedDocumentProtocols = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by the scenario's index.tsx
    const reader = window.reader as Reader

    return reader.spineItemsManager.items
      .filter((item) => item.value.isLoaded)
      .map(
        (item) =>
          new URL(
            item.renderer.getDocumentFrame()?.contentDocument?.URL ??
              "about:blank",
          ).protocol,
      )
  })

/**
 * Every loaded spine item's document came in the way the scenario was asked
 * to load its book, so a spec run both ways cannot run the same way twice.
 * It waits for a document to have loaded: a frame shows its text before its
 * item counts as loaded.
 */
export const expectDocumentsLoadedWith = async (
  page: Page,
  resourceLoading: ResourceLoading,
) => {
  await expect.poll(() => getLoadedDocumentProtocols(page)).not.toHaveLength(0)

  expect(new Set(await getLoadedDocumentProtocols(page))).toEqual(
    new Set([DOCUMENT_PROTOCOL_BY_RESOURCE_LOADING[resourceLoading]]),
  )
}

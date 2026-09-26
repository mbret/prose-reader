import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { resizeAndSettle, waitForSettled } from "../../../utils/pagination"
import { isElementStartOnScreen } from "../../../utils/visibility"

/**
 * A url names a spine item, and an element of it by its fragment. Going to one
 * shows the page holding that element, whether its item was loaded or not,
 * and keeps showing it when the book is laid out again.
 */

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

const chapter = "ch02.xhtml"
// Near the end of a long chapter, many pages after its start.
const fragment = "_page_numbering"

const initialSize = { width: 690, height: 1294 }
const narrowSize = { width: 375, height: 667 }

const getItem = (page: Page, href: string) =>
  page.evaluate((href) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const item = reader.context.manifest.spineItems.find((item) =>
      item.href.endsWith(href),
    )

    if (!item) throw new Error(`no ${href} in the book`)

    return {
      index: item.index,
      href: item.href,
      isReady: reader.spineItemsManager.get(item.index)?.value.isReady,
    }
  }, href)

const goToSpineItem = async (page: Page, indexOrId: number) => {
  await page.evaluate((indexOrId) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    reader.navigation.goToSpineItem({ indexOrId, animation: false })
  }, indexOrId)
  await waitForSettled(page)
}

const goToUrl = async (page: Page, value: string) => {
  await page.evaluate((value) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    reader.navigation.goToUrl(value)
  }, value)
  await waitForSettled(page)
}

/** The id of the element the reading position resolves to. */
const getReadingPositionElementId = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    let cfi: string | undefined

    // Replays the current one, synchronously.
    reader.navigation.readingPosition$
      .subscribe((value) => {
        cfi = value.cfi
      })
      .unsubscribe()

    const { node } = cfi ? reader.cfi.resolveCfi({ cfi }) : {}

    // The node is from the document's own window, so `instanceof` would not
    // recognize its Element.
    return node?.nodeType === Node.ELEMENT_NODE && "id" in node
      ? node.id
      : `not an element: ${cfi}`
  })

/**
 * Clicks the link to `href` in a spine item's document, or an element inside
 * it, such as a footnote number wrapped in a link.
 */
const clickLink = (
  page: Page,
  spineItemIndex: number,
  href: string,
  { onChild = false } = {},
) =>
  page.evaluate(
    ({ spineItemIndex, href, onChild }) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      const document = reader.spineItemsManager
        .get(spineItemIndex)
        ?.renderer.getDocumentFrame()?.contentDocument
      const link = Array.from(document?.querySelectorAll("a") ?? []).find(
        (link) => link.getAttribute("href") === href,
      )

      if (!document || !link) throw new Error(`no link to ${href}`)

      if (!onChild) return link.click()

      const child = document.createElement("span")

      child.append(...link.childNodes)
      link.append(child)
      child.click()
    },
    { spineItemIndex, href, onChild },
  )

test.describe("Given a url with a fragment", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
  })

  test("into a loaded chapter, it shows the page of its element", async ({
    page,
  }) => {
    await page.goto(url)
    await waitForSettled(page)

    const item = await getItem(page, chapter)

    await goToSpineItem(page, item.index)

    expect(await isElementStartOnScreen(page, item.index, fragment)).toBe(false)

    await goToUrl(page, `${item.href}#${fragment}`)

    await expect
      .poll(() => isElementStartOnScreen(page, item.index, fragment))
      .toBe(true)
  })

  test("into a chapter not loaded yet, it shows the page of its element once the chapter loads", async ({
    page,
  }) => {
    // Only visible chapters load.
    await page.goto(`${url}?preload=0`)
    await waitForSettled(page)

    const item = await getItem(page, chapter)

    expect(item.isReady).toBe(false)

    await goToUrl(page, `${item.href}#${fragment}`)

    await expect
      .poll(() => isElementStartOnScreen(page, item.index, fragment))
      .toBe(true)
  })

  test("the reading position is its element, not the first character of its page", async ({
    page,
  }) => {
    await page.goto(url)
    await waitForSettled(page)

    const item = await getItem(page, chapter)

    await goToSpineItem(page, item.index)
    await goToUrl(page, `${item.href}#${fragment}`)

    await expect
      .poll(() => isElementStartOnScreen(page, item.index, fragment))
      .toBe(true)
    // Like a cfi, the element is the place to reopen at.
    expect(await getReadingPositionElementId(page)).toBe(fragment)
  })

  test("it keeps showing its element when the book is laid out again", async ({
    page,
  }) => {
    await page.goto(url)
    await waitForSettled(page)

    const item = await getItem(page, chapter)

    await goToSpineItem(page, item.index)
    await goToUrl(page, `${item.href}#${fragment}`)

    await expect
      .poll(() => isElementStartOnScreen(page, item.index, fragment))
      .toBe(true)

    // Fewer, narrower pages: the element lands on another page index.
    await resizeAndSettle(page, narrowSize)

    await expect
      .poll(() => isElementStartOnScreen(page, item.index, fragment), {
        timeout: 10_000,
      })
      .toBe(true)
  })
})

test.describe("Given a link to another chapter", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForSettled(page)
  })

  test("a click shows the page of the element its fragment names", async ({
    page,
  }) => {
    const contents = await getItem(page, "bk01-toc.xhtml")
    const item = await getItem(page, chapter)

    await goToSpineItem(page, contents.index)
    await clickLink(page, contents.index, `${chapter}#${fragment}`)
    await waitForSettled(page)

    await expect
      .poll(() => isElementStartOnScreen(page, item.index, fragment))
      .toBe(true)
  })

  test("a click on an element inside the link follows it", async ({ page }) => {
    const contents = await getItem(page, "bk01-toc.xhtml")
    const item = await getItem(page, chapter)

    await goToSpineItem(page, contents.index)
    await clickLink(page, contents.index, `${chapter}#${fragment}`, {
      onChild: true,
    })
    await waitForSettled(page)

    await expect
      .poll(() => isElementStartOnScreen(page, item.index, fragment))
      .toBe(true)
  })
})

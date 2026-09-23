import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { waitForReader, waitForResizesHandled } from "../../utils/pagination"

/**
 * A layout re-measures the viewport and lays out every item, so the reader
 * should run one for each size it is given and none in between. The book is a
 * pre-paginated manga, which shows single pages at these portrait sizes, so
 * the spread never switches here.
 */

const url = "http://localhost:3333/tests/layout/resize/index.html"
const portrait = { width: 400, height: 671 }
const narrower = { width: 360, height: 671 }

const countLayouts = (page: Page) =>
  page.evaluate(() =>
    // @ts-expect-error set by this scenario's index.tsx
    (window.viewportLayouts as () => number)(),
  )

/**
 * The layouts run since `before`, counted once the reader has handled every
 * resize the container reported, which is where the extra layouts came from.
 */
const layoutsSince = async (page: Page, before: number) => {
  await waitForResizesHandled(page)

  return (await countLayouts(page)) - before
}

/** The viewport as the reader last measured it, and as the element is now. */
const viewportSizes = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const { width, element } = reader.viewport.value

    return { measured: width, current: element.clientWidth }
  })

const isSpread = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    return reader.settings.values.computedSpreadMode
  })

const mountInPortrait = async (page: Page) => {
  await page.setViewportSize(portrait)
  await page.goto(url)
  await waitForReader(page)

  expect(await isSpread(page)).toBe(false)
}

test.describe("Given a reader showing single pages", () => {
  test("lays out once at mount", async ({ page }) => {
    await mountInPortrait(page)

    expect(await layoutsSince(page, 0)).toBe(1)
  })

  test("does not lay out when a setting that moves nothing changes", async ({
    page,
  }) => {
    await mountInPortrait(page)

    const before = await countLayouts(page)

    await page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.settings.update({ pageTurnAnimation: "fade" })
    })

    expect(await layoutsSince(page, before)).toBe(0)
  })

  test("is done with a resize once it has measured the new size, in one layout", async ({
    page,
  }) => {
    await mountInPortrait(page)
    await waitForResizesHandled(page)

    const before = await countLayouts(page)

    await page.setViewportSize(narrower)

    expect(await layoutsSince(page, before)).toBe(1)

    const { measured, current } = await viewportSizes(page)

    expect(measured).toBeLessThan(portrait.width)
    expect(measured).toBe(current)
    expect(await isSpread(page)).toBe(false)
  })
})

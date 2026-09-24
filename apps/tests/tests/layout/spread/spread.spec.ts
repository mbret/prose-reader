import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { locateSpineItems } from "../../utils"
import {
  resizeAndSettle,
  updateSettingsAndSettle,
  waitForSettled,
} from "../../utils/pagination"

/**
 * The book is a pre-paginated manga, which shows a spread in landscape and
 * single pages in portrait when `spreadMode` is `auto`.
 *
 * A layout re-measures the viewport and lays out every item, so the reader
 * should run one for each size or spread setting it is given. The layouts are
 * counted once pagination has settled, which covers every layout the reader
 * runs for the change. That none arrives later is proved in
 * `layoutTriggers.test.ts`, where the test holds the observer and the clock.
 */

const url = "http://localhost:3333/tests/layout/spread/index.html"
const landscape = { width: 723, height: 671 }
const portrait = { width: 400, height: 671 }

const countLayouts = (page: Page) =>
  page.evaluate(() =>
    // @ts-expect-error set by this scenario's index.tsx
    (window.viewportLayouts as () => number)(),
  )

const isSpread = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    return reader.viewport.value.isSpread
  })

/**
 * The share of the window's width the second page takes on screen: a half
 * when it is shown in a spread, all of it on its own. The first page opens the
 * book alone, beside a blank page, so it spans the window either way; the
 * second shares a spread with the third.
 */
const secondPageShareOfWidth = async (page: Page) => {
  const [secondPage] = await locateSpineItems({
    page,
    indexes: [1],
    isReady: false,
  })
  const box = await secondPage?.boundingBox()
  const window = page.viewportSize()

  if (!box || !window) throw new Error("the second page has no size on screen")

  return Math.round((box.width / window.width) * 100) / 100
}

/** The layouts `change` ran, read once its result settled. */
const layoutsFor = async (page: Page, change: () => Promise<unknown>) => {
  const before = await countLayouts(page)

  await change()

  return (await countLayouts(page)) - before
}

const openAt = async (page: Page, size: { width: number; height: number }) => {
  await page.setViewportSize(size)
  await page.goto(url)
  await waitForSettled(page)
}

test.describe("Given a reader resized across the spread threshold", () => {
  test("lays out once at mount and once for each resize", async ({ page }) => {
    await openAt(page, landscape)

    expect(await isSpread(page)).toBe(true)
    expect.soft(await countLayouts(page)).toBe(1)

    expect
      .soft(await layoutsFor(page, () => resizeAndSettle(page, portrait)))
      .toBe(1)
    expect(await isSpread(page)).toBe(false)

    expect
      .soft(await layoutsFor(page, () => resizeAndSettle(page, landscape)))
      .toBe(1)
    expect(await isSpread(page)).toBe(true)
  })
})

test.describe("Given the spreadMode setting", () => {
  test("never shows the pages one at a time in landscape, after one layout", async ({
    page,
  }) => {
    await openAt(page, landscape)

    expect(await secondPageShareOfWidth(page)).toBe(0.5)

    expect
      .soft(
        await layoutsFor(page, () =>
          updateSettingsAndSettle(page, { spreadMode: "never" }),
        ),
      )
      .toBe(1)
    expect(await isSpread(page)).toBe(false)
    expect(await secondPageShareOfWidth(page)).toBe(1)
  })

  test("always shows a spread in portrait, after one layout", async ({
    page,
  }) => {
    await openAt(page, portrait)

    expect(await secondPageShareOfWidth(page)).toBe(1)

    expect
      .soft(
        await layoutsFor(page, () =>
          updateSettingsAndSettle(page, { spreadMode: "always" }),
        ),
      )
      .toBe(1)
    expect(await isSpread(page)).toBe(true)
    expect(await secondPageShareOfWidth(page)).toBe(0.5)
  })
})

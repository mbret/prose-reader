import { expect, type Page, test } from "@playwright/test"
import { expectSpineItemsInViewport } from "../../utils"
import { waitForSettled } from "../../utils/pagination"

/**
 * From its creation to its first published pages, a reader has no page to
 * give a tap. A `beforeTapGesture` hook in the form of react-reader's bookmark
 * hook reads the annotation candidates then. A tap in that window must reach
 * the app like any other, and leave every gesture working once the pages are
 * published (#718).
 *
 * The page holds the layout of the comic's first page until the spec releases
 * it, so the window lasts as long as the spec needs.
 *
 * Two changes make it pass, and either one alone does: the candidates give a
 * value before the first pages, and a hook that gives no verdict lets the tap
 * go on. The unit tests of each enhancer cover each one apart.
 */

const url = "http://localhost:3333/tests/gestures/beforeFirstPages/index.html"
// portrait, so a single page spans the window
const windowSize = { width: 400, height: 600 }
const CENTER = { x: 200, y: 300 }

type GesturesBeforeFirstPages = {
  taps: { handled: boolean }[]
  gesturesEnd: { reason?: "error" | "complete" }
  publishedPagesOnEachTap: number[]
  releaseFirstItemLayout: () => void
}

const readGestures = (page: Page) =>
  page.evaluate(() => {
    const { taps, gesturesEnd, publishedPagesOnEachTap } =
      // @ts-expect-error set by this scenario's index.tsx
      window.gesturesBeforeFirstPages as GesturesBeforeFirstPages

    return { taps, gesturesEnd, publishedPagesOnEachTap }
  })

/** Half the window to the left, well past the pan threshold. */
const dragHalfTheWindowLeft = async (page: Page) => {
  await page.mouse.move(300, CENTER.y)
  await page.mouse.down()
  await page.mouse.move(100, CENTER.y, { steps: 10 })
  await page.mouse.up()
}

test.describe("Given a comic whose first layout has not ended", () => {
  test("a tap before the first pages leaves taps and pans working once they are published", async ({
    page,
  }) => {
    await page.setViewportSize(windowSize)
    await page.goto(url)
    await page.waitForFunction(
      () =>
        // @ts-expect-error set by this scenario's index.tsx
        window.gesturesBeforeFirstPages !== undefined,
    )

    await page.mouse.click(CENTER.x, CENTER.y)

    await expect
      .poll(async () => (await readGestures(page)).publishedPagesOnEachTap, {
        message: "the tap never reached the hook",
      })
      .toEqual([0])
    await expect
      .poll(async () => (await readGestures(page)).taps, {
        message: "the tap made before the first pages was never reported",
      })
      .toEqual([{ handled: false }])

    await page.evaluate(() => {
      const { releaseFirstItemLayout } =
        // @ts-expect-error set by this scenario's index.tsx
        window.gesturesBeforeFirstPages as GesturesBeforeFirstPages

      releaseFirstItemLayout()
    })
    await waitForSettled(page)

    await page.mouse.click(CENTER.x, CENTER.y)

    await expect
      .poll(async () => (await readGestures(page)).taps, {
        message: "a tap made once the pages are published was never reported",
      })
      .toEqual([{ handled: false }, { handled: false }])

    await dragHalfTheWindowLeft(page)

    await expectSpineItemsInViewport({ page, indexes: [1] })
    expect((await readGestures(page)).gesturesEnd).toEqual({})
  })
})

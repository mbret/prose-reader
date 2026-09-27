import { expect, type Page, test } from "@playwright/test"
import type { Reader, ReadingPosition } from "@prose-reader/core"
import { waitForSettled } from "../../../utils/pagination"
import {
  getChapterIndex,
  getLongChapterIndex,
  initialSize,
  narrowSize,
  navigateAndReadAtOnce,
  readPosition,
  recordReadingPositions,
  resizeAndExpectAnchorVisible,
  url,
} from "./readingPosition"

test.describe("Given a chapter not loaded yet", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForSettled(page)
  })

  test("a chapter still loading is the reading position at once, and its first page once it loads", async ({
    page,
  }) => {
    const chapterIndex = await getChapterIndex(page, "ch03.xhtml")
    const readRecorded = await recordReadingPositions(page)
    const atOnce = await navigateAndReadAtOnce(page, {
      spineItem: chapterIndex,
    })
    await waitForSettled(page)

    const settled = await readPosition(page)

    /**
     * The chapter was not loaded, so no text of it could be named yet: its
     * start stands in, pending, since the reader has left the page before.
     * Once it has loaded, the reading position becomes its first page's first
     * character, a success, and stays there.
     */
    expect(atOnce.wasReady).toBe(false)
    expect(atOnce.isRootCfi).toBe(true)
    expect(atOnce.status).toBe("pending")
    expect(atOnce.itemIndex).toBe(chapterIndex)
    expect(atOnce.percentageEstimateOfBook).toBeCloseTo(
      settled.chapterStart,
      10,
    )
    expect(settled.spineItemIndex).toBe(chapterIndex)
    expect(settled.isRootCfi).toBe(false)
    expect(settled.pageIndex).toBe(0)
    expect(settled.readingProgression).toBeCloseTo(settled.chapterStart, 10)
    expect(settled.readingPositionStatus).toBe("success")
    expect(await readRecorded()).toEqual([
      {
        cfi: atOnce.cfi,
        isRootCfi: true,
        itemIndex: chapterIndex,
        status: "pending",
      },
      {
        cfi: settled.cfi,
        isRootCfi: false,
        itemIndex: chapterIndex,
        status: "success",
      },
    ])
  })

  test("a chapter grabbed while it loads becomes its first page once the user lets go", async ({
    page,
  }) => {
    const chapterIndex = await getChapterIndex(page, "ch03.xhtml")
    const readRecorded = await recordReadingPositions(page)

    /**
     * The user goes to a chapter that is not loaded, and grabs the page as
     * soon as it starts loading, the way a pan would.
     */
    const held = await page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      const item = reader.spineItemsManager.get(indexOrId)

      if (!item || item.value.isReady) throw new Error("chapter already ready")

      return new Promise<{
        isReady: boolean
        isRootCfi: boolean
        status: ReadingPosition["status"] | undefined
      }>((resolve) => {
        let isHeld = false
        const loading = item.watch("loadStatus").subscribe((loadStatus) => {
          // Held once, when the load starts.
          if (loadStatus !== "loading" || isHeld) return

          isHeld = true
          // @ts-expect-error scratch slot for this spec
          window.__letGo = reader.navigation.lock()
          queueMicrotask(() => loading.unsubscribe())

          let readingPosition: ReadingPosition | undefined
          reader.navigation.readingPosition$
            .subscribe((value) => {
              readingPosition = value
            })
            .unsubscribe()

          resolve({
            isReady: item.value.isReady,
            isRootCfi: reader.cfi.isRootCfi(readingPosition?.cfi ?? ""),
            status: readingPosition?.status,
          })
        })

        reader.navigation.goToSpineItem({ indexOrId })
      })
    }, chapterIndex)

    /**
     * A held page loads nothing: the chapter finishes loading once the user
     * lets go, the navigator restores the navigation onto the layout that
     * follows, and that gives the reading position its page. Until then it is
     * the chapter's start.
     */
    expect(held).toEqual({
      isReady: false,
      isRootCfi: true,
      status: "pending",
    })

    await page.evaluate(() => {
      // @ts-expect-error scratch slot for this spec
      window.__letGo()
    })

    const settled = await readPosition(page)

    expect(settled.spineItemIndex).toBe(chapterIndex)
    expect(settled.isRootCfi).toBe(false)
    expect(settled.readingPosition).toBe(settled.cfi)

    const recorded = await readRecorded()

    expect(recorded.map(({ isRootCfi }) => isRootCfi)).toEqual([true, false])
    expect(recorded.map(({ status }) => status)).toEqual(["pending", "success"])
    expect(recorded.map(({ itemIndex }) => itemIndex)).toEqual([
      chapterIndex,
      chapterIndex,
    ])
    expect(recorded[1]?.cfi).toBe(settled.cfi)
  })
})

/**
 * Opens a chapter that is not loaded yet at a cfi naming only the chapter,
 * written as another tool can write it: without the id assertion the reader
 * adds. Reads the reading position at once, then once the chapter settles.
 */
const openChapterAtRootCfi = async (page: Page) => {
  const chapterIndex = await getChapterIndex(page, "ch03.xhtml")
  const { cfi, chapterStart } = await page.evaluate((index) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const item = reader.context.manifest.spineItems[index]

    if (!item) throw new Error("no chapter")

    return {
      cfi: `epubcfi(/6/${(index + 1) * 2}!)`,
      chapterStart: reader.cfi.generateRootCfi(item),
    }
  }, chapterIndex)

  expect(chapterStart).not.toBe(cfi)

  const readRecorded = await recordReadingPositions(page)
  const atOnce = await navigateAndReadAtOnce(page, { cfi, into: chapterIndex })
  await waitForSettled(page)

  expect(atOnce.wasReady).toBe(false)

  return {
    chapterIndex,
    chapterStart,
    atOnce,
    settled: await readPosition(page),
    recorded: await readRecorded(),
  }
}

test.describe("Given a chapter opened at a cfi naming only the chapter", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForSettled(page)
  })

  test("the reading position is the chapter start as the reader names it, while the chapter loads", async ({
    page,
  }) => {
    const { atOnce, chapterStart } = await openChapterAtRootCfi(page)

    expect(atOnce.cfi).toBe(chapterStart)
    expect(atOnce.status).toBe("pending")
  })

  test("the reading position is the chapter's first page once it loads, not the chapter", async ({
    page,
  }) => {
    const { atOnce, settled, recorded, chapterIndex } =
      await openChapterAtRootCfi(page)

    // A cfi naming only the chapter names no text to reopen at.
    expect(settled.spineItemIndex).toBe(chapterIndex)
    expect(settled.isRootCfi).toBe(false)
    expect(settled.readingPosition).toBe(settled.cfi)
    expect(recorded.map(({ cfi }) => cfi)).toEqual([atOnce.cfi, settled.cfi])
    expect(recorded.map(({ status }) => status)).toEqual(["pending", "success"])
  })
})

test.describe("Given a cfi naming nothing in a chapter not loaded yet", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    // Only visible chapters load, so the chapter gone to is not loaded yet.
    await page.goto(`${url}?preload=0`)
    await waitForSettled(page)
  })

  test("the reading position is the chapter's start while the chapter loads, then the page shown, which reopens the book there", async ({
    page,
  }) => {
    const chapterIndex = await getLongChapterIndex(page)
    // A path no node of the chapter has, as a saved position can once the
    // book changed.
    const cfi = `epubcfi(/6/${(chapterIndex + 1) * 2}!/4/2/999/1:0)`
    const readRecorded = await recordReadingPositions(page)
    const atOnce = await navigateAndReadAtOnce(page, {
      cfi,
      into: chapterIndex,
    })
    await waitForSettled(page)

    const settled = await readPosition(page)

    /**
     * Until the chapter is loaded, the reader does not know where the cfi
     * takes it: the reading position stands in at the chapter's start, as for
     * any navigation into a chapter not loaded, never the cfi as asked.
     * Once it has loaded, the reader is at the chapter's start, where the cfi
     * could not take it, and the reading position is the page shown, a
     * success.
     */
    expect(atOnce.wasReady).toBe(false)
    expect(atOnce.isRootCfi).toBe(true)
    expect(atOnce.itemIndex).toBe(chapterIndex)
    expect(atOnce.status).toBe("pending")
    expect(atOnce.percentageEstimateOfBook).toBeCloseTo(
      settled.chapterStart,
      10,
    )
    expect(settled.spineItemIndex).toBe(chapterIndex)
    expect(settled.pageIndex).toBe(0)
    expect(settled.isRootCfi).toBe(false)
    expect(settled.readingPosition).toBe(settled.cfi)
    expect(settled.readingProgression).toBeCloseTo(settled.chapterStart, 10)
    expect(await readRecorded()).toEqual([
      {
        cfi: atOnce.cfi,
        isRootCfi: true,
        itemIndex: chapterIndex,
        status: "pending",
      },
      {
        cfi: settled.cfi,
        isRootCfi: false,
        itemIndex: chapterIndex,
        status: "success",
      },
    ])

    // A relayout restores to the page shown, as for any page gone to.
    await resizeAndExpectAnchorVisible(page, narrowSize, settled.cfi)

    await page.setViewportSize(initialSize)
    await page.goto(`${url}?preload=0&cfi=${encodeURIComponent(settled.cfi)}`)
    await waitForSettled(page)

    const reopened = await readPosition(page)

    expect(reopened.spineItemIndex).toBe(chapterIndex)
    expect(reopened.pageIndex).toBe(settled.pageIndex)
    expect(reopened.readingPosition).toBe(settled.cfi)
    expect(reopened.readingPositionStatus).toBe("success")
    expect(reopened.readingProgression).toBeCloseTo(
      settled.readingProgression ?? Number.NaN,
      10,
    )
  })
})

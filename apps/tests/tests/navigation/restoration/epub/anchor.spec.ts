import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import {
  isCfiPositionVisible,
  navigateAndSettle,
  resizeAndSettle,
  waitForReader,
} from "../../../utils/pagination"

/**
 * Restoring a page after a resize needs a cfi. A navigation that asked for one
 * restores to it; one that did not, such as a page reached by turning pages,
 * restores to the text at the page it went to. That is the reading position,
 * the value to save and reopen the book at. These tests exercise that path.
 */

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/**
 * The settled position. Settlement drops for a moment whenever the spine lays
 * itself out again for an item loading nearby, so this waits for a settled
 * result and reads it in the same evaluation.
 */
const readPosition = async (page: Page) => {
  const handle = await page.waitForFunction(
    () => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      const pagination = reader.pagination.state

      if (!pagination.isSettled) return undefined

      const { begin } = pagination
      const navigation = reader.navigation.getNavigation()
      let readingPosition: string | undefined
      // Replays the current one, synchronously.
      reader.navigation.readingPosition$
        .subscribe((cfi) => {
          readingPosition = cfi
        })
        .unsubscribe()

      return {
        cfi: begin.cfi,
        isRootCfi: reader.cfi.isRootCfi(begin.cfi),
        pageIndex: begin.pageIndexInSpineItem,
        numberOfPages: begin.numberOfPagesInSpineItem,
        spineItemIndex: begin.spineItemIndex,
        navigationCfi: navigation.cfi,
        readingPosition,
      }
    },
    undefined,
    { timeout: 10_000 },
  )
  const position = await handle.jsonValue()

  if (!position) throw new Error("no settled pagination result")

  return position
}

/**
 * Records every reading position from now on, leaving out the current one
 * that subscribing replays. Returns a reader of what was recorded so far.
 */
const recordReadingPositions = async (page: Page) => {
  await page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const recorded: string[] = []
    let replaying = true

    reader.navigation.readingPosition$.subscribe((cfi) => {
      if (!replaying) recorded.push(cfi)
    })
    replaying = false

    // @ts-expect-error scratch slot for this spec
    window.__readingPositions = recorded
  })

  return () =>
    page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      // @ts-expect-error scratch slot for this spec
      const recorded = window.__readingPositions as string[]

      return recorded.map((cfi) => ({
        cfi,
        isRootCfi: reader.cfi.isRootCfi(cfi),
        itemIndex: reader.cfi.parseCfi(cfi).itemIndex,
      }))
    })
}

const getChapterIndex = async (page: Page, href: string) => {
  const chapterIndex = await page.evaluate((href) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    return reader.context.manifest.spineItems.findIndex((item) =>
      item.href.endsWith(href),
    )
  }, href)

  expect(chapterIndex).toBeGreaterThan(0)

  return chapterIndex
}

const getLongChapterIndex = (page: Page) => getChapterIndex(page, "ch02.xhtml")

/**
 * Runs a navigation and reads the reading position in the same task, before
 * anything asynchronous has happened, along with whether its item was ready
 * when the navigation started.
 */
const navigateAndReadAtOnce = (
  page: Page,
  navigation: { turn: "left" | "right"; into: number } | { spineItem: number },
) =>
  page.evaluate((navigation) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const target =
      "spineItem" in navigation ? navigation.spineItem : navigation.into
    const wasReady =
      reader.spineItemsManager.get(target)?.value.isReady ?? false

    if ("spineItem" in navigation) {
      reader.navigation.goToSpineItem({ indexOrId: navigation.spineItem })
    } else if (navigation.turn === "left") {
      reader.navigation.turnLeft()
    } else {
      reader.navigation.turnRight()
    }

    let cfi: string | undefined
    reader.navigation.readingPosition$
      .subscribe((value) => {
        cfi = value
      })
      .unsubscribe()

    if (cfi === undefined) throw new Error("no reading position")

    return {
      cfi,
      isRootCfi: reader.cfi.isRootCfi(cfi),
      itemIndex: reader.cfi.parseCfi(cfi).itemIndex,
      wasReady,
    }
  }, navigation)

/** Third page of a long chapter, reached by turning pages. */
const turnToThirdPageOfLongChapter = async (page: Page) => {
  const chapterIndex = await getLongChapterIndex(page)

  await navigateAndSettle(page, () =>
    page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    }, chapterIndex),
  )

  for (let turn = 0; turn < 2; turn++) {
    await navigateAndSettle(page, () =>
      page.evaluate(() => {
        // @ts-expect-error window.reader is set by this scenario's index.tsx
        const reader = window.reader as Reader

        reader.navigation.turnRight()
      }),
    )
  }

  const position = await readPosition(page)

  expect(position.spineItemIndex).toBe(chapterIndex)
  expect(position.pageIndex).toBe(2)
  expect(position.isRootCfi).toBe(false)
  // Restoration reads the navigation's own `cfi` before the anchor. It must be
  // absent here, or a resize could restore through it and prove nothing about
  // the anchor.
  expect(position.navigationCfi).toBeUndefined()

  return position
}

const initialSize = { width: 690, height: 1294 }
// Fewer, narrower pages: the same character lands on another page index, so
// restoring by page or by offset within the item would miss it.
const narrowSize = { width: 375, height: 667 }

const resizeAndExpectAnchorVisible = async (
  page: Page,
  size: { width: number; height: number },
  cfi: string,
) => {
  await resizeAndSettle(page, size)

  // Restoration is a navigation of its own, so give it a moment to land.
  await expect
    .poll(() => isCfiPositionVisible(page, cfi), { timeout: 10_000 })
    .toBe(true)
}

test.describe("Given a page reached by turning pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForReader(page)
  })

  test("a page turn is the reading position from the moment it happens", async ({
    page,
  }) => {
    const chapterIndex = await getLongChapterIndex(page)

    await navigateAndSettle(page, () =>
      page.evaluate((indexOrId) => {
        // @ts-expect-error window.reader is set by this scenario's index.tsx
        const reader = window.reader as Reader

        reader.navigation.goToSpineItem({ indexOrId })
      }, chapterIndex),
    )

    const readRecorded = await recordReadingPositions(page)
    let atOnce: Awaited<ReturnType<typeof navigateAndReadAtOnce>> | undefined

    await navigateAndSettle(page, async () => {
      atOnce = await navigateAndReadAtOnce(page, {
        turn: "right",
        into: chapterIndex,
      })
    })

    const turned = await readPosition(page)

    /**
     * The chapter is laid out, so the page the turn goes to is known when the
     * turn happens: the reading position is its first character straight
     * away, the one pagination settles on afterwards, and nothing else.
     */
    expect(atOnce?.wasReady).toBe(true)
    expect(turned.pageIndex).toBe(1)
    expect(atOnce?.isRootCfi).toBe(false)
    expect(atOnce?.cfi).toBe(turned.cfi)
    expect(await readRecorded()).toEqual([
      { cfi: turned.cfi, isRootCfi: false, itemIndex: chapterIndex },
    ])
  })

  test("a chapter still loading is the reading position at once, and its first page once it loads", async ({
    page,
  }) => {
    const chapterIndex = await getChapterIndex(page, "ch03.xhtml")
    const readRecorded = await recordReadingPositions(page)
    let atOnce: Awaited<ReturnType<typeof navigateAndReadAtOnce>> | undefined

    await navigateAndSettle(page, async () => {
      atOnce = await navigateAndReadAtOnce(page, { spineItem: chapterIndex })
    })

    const settled = await readPosition(page)

    /**
     * The chapter was not loaded, so no text of it could be named yet: its
     * start stands in, since the reader has left the page before. Once it
     * has loaded, the reading position becomes its first page's first
     * character, and stays there.
     */
    expect(atOnce?.wasReady).toBe(false)
    expect(atOnce?.isRootCfi).toBe(true)
    expect(atOnce?.itemIndex).toBe(chapterIndex)
    expect(settled.spineItemIndex).toBe(chapterIndex)
    expect(settled.isRootCfi).toBe(false)
    expect(await readRecorded()).toEqual([
      { cfi: atOnce?.cfi, isRootCfi: true, itemIndex: chapterIndex },
      { cfi: settled.cfi, isRootCfi: false, itemIndex: chapterIndex },
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

      return new Promise<{ isReady: boolean; isRootCfi: boolean }>(
        (resolve) => {
          let isHeld = false
          const loading = item.renderer.state$.subscribe(({ state }) => {
            // The renderer can report loading more than once.
            if (state !== "loading" || isHeld) return

            isHeld = true
            // @ts-expect-error scratch slot for this spec
            window.__letGo = reader.navigation.lock()
            queueMicrotask(() => loading.unsubscribe())

            let cfi = ""
            reader.navigation.readingPosition$
              .subscribe((value) => {
                cfi = value
              })
              .unsubscribe()

            resolve({
              isReady: item.value.isReady,
              isRootCfi: reader.cfi.isRootCfi(cfi),
            })
          })

          reader.navigation.goToSpineItem({ indexOrId })
        },
      )
    }, chapterIndex)

    /**
     * A held page loads nothing: the chapter finishes loading once the user
     * lets go, the navigator restores the navigation onto the layout that
     * follows, and that gives the reading position its page. Until then it is
     * the chapter's start.
     */
    expect(held).toEqual({ isReady: false, isRootCfi: true })

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
    expect(recorded.map(({ itemIndex }) => itemIndex)).toEqual([
      chapterIndex,
      chapterIndex,
    ])
    expect(recorded[1]?.cfi).toBe(settled.cfi)
  })

  test("the settled result is the reading position, and a resize restores to it", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    expect(position.readingPosition).toBe(position.cfi)

    await resizeAndExpectAnchorVisible(page, narrowSize, position.cfi)
  })

  test("navigating to the same page again anchors the new navigation, and a resize restores to it", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    // A navigation to the position already shown is a new one. It starts
    // without an anchor, and restoration only reads the current navigation's
    // anchor, so it needs one of its own even though nothing moved.
    await navigateAndSettle(page, () =>
      page.evaluate(() => {
        // @ts-expect-error window.reader is set by this scenario's index.tsx
        const reader = window.reader as Reader

        reader.navigation.navigate({
          position: reader.navigation.getNavigation().position,
        })
      }),
    )

    const renavigated = await readPosition(page)

    expect(renavigated.cfi).toBe(position.cfi)
    expect(renavigated.readingPosition).toBe(position.cfi)

    await resizeAndExpectAnchorVisible(page, narrowSize, position.cfi)
  })

  test("repeated resizes keep the page, and the original size shows the original page again", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    /**
     * The anchor is the page the user turned to. Each restoration lands on the
     * page that now holds it, but must not move the anchor to that page's own
     * first character: at the next resize that would restore to the page
     * before, and every round trip would walk the reader backwards.
     */
    for (const size of [
      narrowSize,
      initialSize,
      { width: 500, height: 900 },
      initialSize,
    ]) {
      await resizeAndExpectAnchorVisible(page, size, position.cfi)
    }

    const restored = await readPosition(page)

    expect(restored.pageIndex).toBe(position.pageIndex)
    expect(restored.cfi).toBe(position.cfi)
    expect(restored.readingPosition).toBe(position.cfi)
  })

  test("the reading position saved at another size reopens the book on the same page", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    await resizeAndExpectAnchorVisible(page, narrowSize, position.cfi)

    /**
     * At the narrower size the page holding the anchor starts earlier, so the
     * visible range moved while the reader did not. Saving the visible range
     * would reopen the book on the page before at the original size, one page
     * further back at every save; the reading position stays put.
     */
    const narrow = await readPosition(page)

    expect(narrow.cfi).not.toBe(position.cfi)
    expect(narrow.readingPosition).toBe(position.cfi)

    await page.setViewportSize(initialSize)
    await page.goto(`${url}?cfi=${encodeURIComponent(position.cfi)}`)
    await waitForReader(page)

    const reopened = await readPosition(page)

    expect(reopened.spineItemIndex).toBe(position.spineItemIndex)
    expect(reopened.pageIndex).toBe(position.pageIndex)
    expect(reopened.readingPosition).toBe(position.cfi)
  })
})

test.describe("Given chapters that are not preloaded", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    // Only visible chapters load, so the one before is never loaded yet.
    await page.goto(`${url}?preload=0`)
    await waitForReader(page)
  })

  test("a turn back into a previous chapter is its start at once, and its last page once it loads", async ({
    page,
  }) => {
    const previousIndex = await getLongChapterIndex(page)

    await navigateAndSettle(page, () =>
      page.evaluate((indexOrId) => {
        // @ts-expect-error window.reader is set by this scenario's index.tsx
        const reader = window.reader as Reader

        reader.navigation.goToSpineItem({ indexOrId })
      }, previousIndex + 1),
    )

    const readRecorded = await recordReadingPositions(page)
    let atOnce: Awaited<ReturnType<typeof navigateAndReadAtOnce>> | undefined

    await navigateAndSettle(page, async () => {
      atOnce = await navigateAndReadAtOnce(page, {
        turn: "left",
        into: previousIndex,
      })
    })

    const settled = await readPosition(page)

    /**
     * Turning back lands on the previous chapter's last page. Until that
     * chapter is loaded no text of it can be named, so the reading position
     * is its start; once it has loaded, it is the last page's first
     * character.
     */
    expect(atOnce?.wasReady).toBe(false)
    expect(atOnce?.isRootCfi).toBe(true)
    expect(atOnce?.itemIndex).toBe(previousIndex)
    expect(settled.spineItemIndex).toBe(previousIndex)
    expect(settled.numberOfPages).toBeGreaterThan(1)
    expect(settled.pageIndex).toBe(settled.numberOfPages - 1)
    expect(settled.isRootCfi).toBe(false)
    expect(settled.readingPosition).toBe(settled.cfi)
    expect(await readRecorded()).toEqual([
      { cfi: atOnce?.cfi, isRootCfi: true, itemIndex: previousIndex },
      { cfi: settled.cfi, isRootCfi: false, itemIndex: previousIndex },
    ])
  })
})

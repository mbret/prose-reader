import { expect, type Page, test } from "@playwright/test"
import type { Reader, ReadingPosition } from "@prose-reader/core"
import { resizeAndSettle, waitForSettled } from "../../../utils/pagination"
import { isCfiPositionVisible } from "../../../utils/visibility"

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
      let readingPosition: ReadingPosition | undefined
      // Replays the current one, synchronously.
      reader.navigation.readingPosition$
        .subscribe((value) => {
          readingPosition = value
        })
        .unsubscribe()

      /**
       * Where the begin page starts in the book: its chapter's start, and the
       * share of the chapter's weight the pages before it hold. Every chapter
       * of this book has a weight, so they only need scaling to their total.
       */
      const { spineItems } = reader.context.manifest
      const totalWeight = spineItems.reduce(
        (total, { progressionWeight }) =>
          total + (progressionWeight ?? Number.NaN),
        0,
      )
      const weightOf = (index: number) =>
        (spineItems[index]?.progressionWeight ?? Number.NaN) / totalWeight
      const chapterStart = spineItems
        .slice(0, begin.spineItemIndex)
        .reduce((total, _, index) => total + weightOf(index), 0)
      const beginPageProgression =
        chapterStart +
        (weightOf(begin.spineItemIndex ?? 0) *
          (begin.pageIndexInSpineItem ?? 0)) /
          begin.numberOfPagesInSpineItem

      return {
        cfi: begin.cfi,
        isRootCfi: reader.cfi.isRootCfi(begin.cfi),
        pageIndex: begin.pageIndexInSpineItem,
        numberOfPages: begin.numberOfPagesInSpineItem,
        spineItemIndex: begin.spineItemIndex,
        chapterStart,
        beginPageProgression,
        navigationCfi:
          navigation.target.type === "cfi"
            ? navigation.target.value
            : undefined,
        readingPosition: readingPosition?.cfi,
        readingProgression: readingPosition?.percentageEstimateOfBook,
        readingPositionState: readingPosition?.state,
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
    const recorded: Pick<ReadingPosition, "cfi" | "state">[] = []
    let replaying = true

    reader.navigation.readingPosition$.subscribe(({ cfi, state }) => {
      if (!replaying) recorded.push({ cfi, state })
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
      const recorded = window.__readingPositions as Pick<
        ReadingPosition,
        "cfi" | "state"
      >[]

      return recorded.map(({ cfi, state }) => ({
        cfi,
        isRootCfi: reader.cfi.isRootCfi(cfi),
        itemIndex: reader.cfi.parseCfi(cfi).itemIndex,
        state,
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
  navigation:
    | { turn: "left" | "right"; into: number }
    | { cfi: string; into: number }
    | { spineItem: number },
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
    } else if ("cfi" in navigation) {
      reader.navigation.goToCfi(navigation.cfi)
    } else if (navigation.turn === "left") {
      reader.navigation.turnLeft()
    } else {
      reader.navigation.turnRight()
    }

    let readingPosition: ReadingPosition | undefined
    reader.navigation.readingPosition$
      .subscribe((value) => {
        readingPosition = value
      })
      .unsubscribe()

    if (readingPosition === undefined) throw new Error("no reading position")

    const { cfi, percentageEstimateOfBook, state } = readingPosition

    return {
      cfi,
      percentageEstimateOfBook,
      state,
      isRootCfi: reader.cfi.isRootCfi(cfi),
      itemIndex: reader.cfi.parseCfi(cfi).itemIndex,
      wasReady,
    }
  }, navigation)

/** Third page of a long chapter, reached by turning pages. */
const turnToThirdPageOfLongChapter = async (page: Page) => {
  const chapterIndex = await getLongChapterIndex(page)

  await page.evaluate((indexOrId) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    reader.navigation.goToSpineItem({ indexOrId })
  }, chapterIndex)
  await waitForSettled(page)

  for (let turn = 0; turn < 2; turn++) {
    await page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.turnRight()
    })
    await waitForSettled(page)
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
    await waitForSettled(page)
  })

  test("a page turn is the reading position from the moment it happens", async ({
    page,
  }) => {
    const chapterIndex = await getLongChapterIndex(page)

    await page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    }, chapterIndex)
    await waitForSettled(page)

    const readRecorded = await recordReadingPositions(page)
    const atOnce = await navigateAndReadAtOnce(page, {
      turn: "right",
      into: chapterIndex,
    })
    await waitForSettled(page)

    const turned = await readPosition(page)

    /**
     * The chapter is laid out, so the page the turn goes to is known when the
     * turn happens: the reading position is its first character straight
     * away, the one pagination settles on afterwards, and nothing else.
     */
    expect(atOnce.wasReady).toBe(true)
    expect(turned.pageIndex).toBe(1)
    expect(atOnce.isRootCfi).toBe(false)
    expect(atOnce.cfi).toBe(turned.cfi)
    expect(atOnce.state).toBe("final")
    expect(await readRecorded()).toEqual([
      {
        cfi: turned.cfi,
        isRootCfi: false,
        itemIndex: chapterIndex,
        state: "final",
      },
    ])
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
     * start stands in, since the reader has left the page before. Once it
     * has loaded, the reading position becomes its first page's first
     * character, and stays there.
     */
    expect(atOnce.wasReady).toBe(false)
    expect(atOnce.isRootCfi).toBe(true)
    expect(atOnce.state).toBe("standIn")
    expect(atOnce.itemIndex).toBe(chapterIndex)
    expect(atOnce.percentageEstimateOfBook).toBeCloseTo(
      settled.chapterStart,
      10,
    )
    expect(settled.spineItemIndex).toBe(chapterIndex)
    expect(settled.isRootCfi).toBe(false)
    expect(settled.pageIndex).toBe(0)
    expect(settled.readingProgression).toBeCloseTo(settled.chapterStart, 10)
    expect(settled.readingPositionState).toBe("final")
    expect(await readRecorded()).toEqual([
      {
        cfi: atOnce.cfi,
        isRootCfi: true,
        itemIndex: chapterIndex,
        state: "standIn",
      },
      {
        cfi: settled.cfi,
        isRootCfi: false,
        itemIndex: chapterIndex,
        state: "final",
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
        state: ReadingPosition["state"] | undefined
      }>((resolve) => {
        let isHeld = false
        const loading = item.renderer.state$.subscribe(({ state }) => {
          // The renderer can report loading more than once.
          if (state !== "loading" || isHeld) return

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
            state: readingPosition?.state,
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
      state: "standIn",
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
    expect(recorded.map(({ state }) => state)).toEqual(["standIn", "final"])
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
    expect(position.readingPositionState).toBe("final")

    /**
     * Two pages into the chapter, the reading position is past the chapter's
     * start by the share of its weight those pages hold.
     */
    expect(position.readingProgression).toBeGreaterThan(position.chapterStart)
    expect(position.readingProgression).toBeCloseTo(
      position.beginPageProgression,
      10,
    )

    await resizeAndExpectAnchorVisible(page, narrowSize, position.cfi)
  })

  test("navigating to the same page again anchors the new navigation, and a resize restores to it", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    // A navigation to the position already shown is a new one. It starts
    // without an anchor, and restoration only reads the current navigation's
    // anchor, so it needs one of its own even though nothing moved.
    await page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.navigate({
        target: {
          type: "position",
          value: reader.navigation.getNavigation().position,
        },
      })
    })
    await waitForSettled(page)

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
    expect(restored.readingProgression).toBe(position.readingProgression)
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
    expect(narrow.readingProgression).toBe(position.readingProgression)

    await page.setViewportSize(initialSize)
    await page.goto(`${url}?cfi=${encodeURIComponent(position.cfi)}`)
    await waitForSettled(page)

    const reopened = await readPosition(page)

    expect(reopened.spineItemIndex).toBe(position.spineItemIndex)
    expect(reopened.pageIndex).toBe(position.pageIndex)
    expect(reopened.readingPosition).toBe(position.cfi)
    // Found in its chapter's document, where the page holding it is measured.
    expect(reopened.readingPositionState).toBe("final")
    expect(reopened.readingProgression).toBeCloseTo(
      position.readingProgression ?? Number.NaN,
      10,
    )
  })

  test("a book reopened at the reading position reports its chapter's start on the way, never the book's, and ends final on it", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    await page.goto(`${url}?cfi=${encodeURIComponent(position.cfi)}`)
    await waitForSettled(page)
    await expect
      .poll(() => readPosition(page).then((read) => read.readingPositionState))
      .toBe("final")

    // Every value an app saving the reading position would have saved.
    const saved = await page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      // @ts-expect-error window.readingPositions is set by this scenario's index.tsx
      const values = window.readingPositions as ReadingPosition[]

      return values.map((value) => ({
        ...value,
        isRootCfi: reader.cfi.isRootCfi(value.cfi),
        itemIndex: reader.cfi.parseCfi(value.cfi).itemIndex,
      }))
    })

    /**
     * Until the chapter is loaded, the reader does not know where the cfi
     * takes it: the reading position stands in at the chapter's start, as for
     * any navigation into a chapter not loaded. Then it is the cfi, the place
     * the target names, final once the page holding it is laid out. None is
     * the start of the book.
     */
    const last = saved[saved.length - 1]

    expect(last).toMatchObject({ cfi: position.cfi, state: "final" })
    expect(last?.percentageEstimateOfBook).toBeCloseTo(
      position.readingProgression ?? Number.NaN,
      10,
    )
    const chapterStart = "the chapter's start"
    const onTheWay = [
      {
        state: "standIn",
        itemIndex: position.spineItemIndex,
        cfi: chapterStart,
      },
      {
        state: "targetPlace",
        itemIndex: position.spineItemIndex,
        cfi: position.cfi,
      },
    ]

    for (const { state, itemIndex, cfi, isRootCfi } of saved.slice(0, -1)) {
      expect(onTheWay).toContainEqual({
        state,
        itemIndex,
        cfi: isRootCfi ? chapterStart : cfi,
      })
    }
    for (const { percentageEstimateOfBook } of saved) {
      expect(percentageEstimateOfBook).toBeGreaterThanOrEqual(
        position.chapterStart,
      )
    }
  })
})

/**
 * Drags the page a fifth of the window towards the next one and lets go, with
 * the pan navigator, as a finger does. That is past the snap threshold, so the
 * page turns once let go, and short of half the page, so while held the page
 * before is the one that shows the most.
 */
const dragTowardsTheNextPage = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const { panNavigator } = reader.navigation
    // A finger moving left pulls the next page in.
    const delta = { x: -window.innerWidth / 5, y: 0 }

    panNavigator.start({ x: 0, y: 0 })
    panNavigator.panMoveTo(delta)
    panNavigator.stop(delta)
  })

test.describe("Given a page reached by dragging", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForSettled(page)
  })

  test("the reading position is the page the drag lands on, not the one it was held on, and a resize restores to it", async ({
    page,
  }) => {
    const chapterIndex = await getLongChapterIndex(page)

    await page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    }, chapterIndex)
    await waitForSettled(page)

    const start = await readPosition(page)

    expect(start.spineItemIndex).toBe(chapterIndex)
    expect(start.pageIndex).toBe(0)
    expect(start.numberOfPages).toBeGreaterThan(1)

    await dragTowardsTheNextPage(page)
    await expect
      .poll(() => readPosition(page).then(({ pageIndex }) => pageIndex))
      .toBe(1)

    const landed = await readPosition(page)

    expect(landed.spineItemIndex).toBe(chapterIndex)
    expect(landed.isRootCfi).toBe(false)
    expect(landed.readingPosition).toBe(landed.cfi)
    expect(landed.readingPositionState).toBe("final")

    /**
     * A resize restores to the reading position: the page before, were it
     * still the one the drag was held on.
     */
    await resizeAndExpectAnchorVisible(page, narrowSize, landed.cfi)
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
    expect(atOnce.state).toBe("standIn")
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
    expect(recorded.map(({ state }) => state)).toEqual(["standIn", "final"])
  })
})

test.describe("Given chapters that are not preloaded", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    // Only visible chapters load, so the one before is never loaded yet.
    await page.goto(`${url}?preload=0`)
    await waitForSettled(page)
  })

  test("a turn back into a previous chapter is its start at once, and its last page once it loads", async ({
    page,
  }) => {
    const previousIndex = await getLongChapterIndex(page)

    await page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    }, previousIndex + 1)
    await waitForSettled(page)

    const readRecorded = await recordReadingPositions(page)
    const atOnce = await navigateAndReadAtOnce(page, {
      turn: "left",
      into: previousIndex,
    })
    await waitForSettled(page)

    const settled = await readPosition(page)

    /**
     * Turning back lands on the previous chapter's last page. Until that
     * chapter is loaded no text of it can be named, so the reading position
     * is its start; once it has loaded, it is the last page's first
     * character.
     */
    expect(atOnce.wasReady).toBe(false)
    expect(atOnce.isRootCfi).toBe(true)
    expect(atOnce.state).toBe("standIn")
    expect(atOnce.itemIndex).toBe(previousIndex)
    expect(atOnce.percentageEstimateOfBook).toBeCloseTo(
      settled.chapterStart,
      10,
    )
    expect(settled.spineItemIndex).toBe(previousIndex)
    expect(settled.numberOfPages).toBeGreaterThan(1)
    expect(settled.pageIndex).toBe(settled.numberOfPages - 1)
    expect(settled.isRootCfi).toBe(false)
    expect(settled.readingPosition).toBe(settled.cfi)
    // The last page starts past the chapter's start, and short of its end.
    expect(settled.readingProgression).toBeCloseTo(
      settled.beginPageProgression,
      10,
    )
    expect(settled.readingProgression).toBeGreaterThan(settled.chapterStart)
    expect(await readRecorded()).toEqual([
      {
        cfi: atOnce.cfi,
        isRootCfi: true,
        itemIndex: previousIndex,
        state: "standIn",
      },
      {
        cfi: settled.cfi,
        isRootCfi: false,
        itemIndex: previousIndex,
        state: "final",
      },
    ])
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
     * could not take it, and the reading position is the page shown, final.
     */
    expect(atOnce.wasReady).toBe(false)
    expect(atOnce.isRootCfi).toBe(true)
    expect(atOnce.itemIndex).toBe(chapterIndex)
    expect(atOnce.state).toBe("standIn")
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
        state: "standIn",
      },
      {
        cfi: settled.cfi,
        isRootCfi: false,
        itemIndex: chapterIndex,
        state: "final",
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
    expect(reopened.readingPositionState).toBe("final")
    expect(reopened.readingProgression).toBeCloseTo(
      settled.readingProgression ?? Number.NaN,
      10,
    )
  })
})

/**
 * Without a horizontal margin, a chapter's first page starts its text at the
 * chapter's left edge, where the reader measures a node at 0.
 */
test.describe("Given pages without a horizontal margin", () => {
  const withoutMargin = `${url}?pageHorizontalMargin=0`

  test("a book reopened at a chapter's first text, at its left edge, ends final on it", async ({
    page,
  }) => {
    await page.setViewportSize(initialSize)
    await page.goto(withoutMargin)
    await waitForSettled(page)

    const chapterIndex = await getLongChapterIndex(page)

    await page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    }, chapterIndex)
    await waitForSettled(page)

    // The chapter's first text, and where its first character is laid out.
    const firstText = await page.evaluate((index) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      const item = reader.spineItemsManager.get(index)
      const document = item?.renderer.getDocumentFrame()?.contentDocument

      if (!item || !document) throw new Error("the chapter has no document")

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        (node) =>
          node.textContent?.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP,
      )
      const node = walker.nextNode()

      if (!node) throw new Error("the chapter has no text")

      const firstCharacter = document.createRange()

      firstCharacter.setStart(node, 0)
      firstCharacter.setEnd(node, 1)

      return {
        cfi: reader.cfi.generateCfiForSpineItemPage({
          spineItem: item.item,
          pageNode: { node, offset: 0 },
        }),
        x: firstCharacter.getBoundingClientRect().x,
      }
    }, chapterIndex)

    expect(firstText.x).toBe(0)

    await page.goto(`${withoutMargin}&cfi=${encodeURIComponent(firstText.cfi)}`)
    await waitForSettled(page)

    // Found in its chapter's document, then measured on the page holding it.
    await expect
      .poll(() =>
        readPosition(page).then(
          ({ readingPositionState }) => readingPositionState,
        ),
      )
      .toBe("final")

    const reopened = await readPosition(page)

    expect(reopened.spineItemIndex).toBe(chapterIndex)
    expect(reopened.pageIndex).toBe(0)
    expect(reopened.readingPosition).toBe(firstText.cfi)
  })
})

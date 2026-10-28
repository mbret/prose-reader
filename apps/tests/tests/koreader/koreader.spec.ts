import { expect, type Page, test } from "@playwright/test"
import type { ReadingPosition } from "@prose-reader/core"
import type { generateXPointer, xPointerToCfi } from "@prose-reader/koreader"
import { goToKoreaderProgress } from "../utils/koreader"
import { waitForSettled } from "../utils/pagination"
import { getReader } from "../utils/reader"
import {
  isCfiPositionVisible,
  isElementStartOnScreen,
} from "../utils/visibility"

/**
 * A KOReader sync client on an EPUB pulls an xpointer as the book's progress,
 * opens the book at it or goes to it, and pushes the reading position back as
 * an xpointer, converting each value as it comes. Opening at one, or going to
 * one, must reach its place even in a chapter that is not loaded yet. Every
 * reading position converts on arrival: pending at the chapter's start while
 * the chapter loads, then the place, a success.
 */

const url = "http://localhost:3333/tests/koreader/index.html"

const chapter = "ch02.xhtml"
// Near the end of a long chapter, many pages after its start.
const fragment = "_page_numbering"

/** What this scenario's index.tsx exposes on the window beside the reader. */
type ScenarioHelpers = {
  readingPositionsAsXPointers: {
    xpointer: string | undefined
    status: ReadingPosition["status"]
  }[]
  koreader: {
    generateXPointer: typeof generateXPointer
    xPointerToCfi: typeof xPointerToCfi
  }
}

const getChapterIndex = async (page: Page) =>
  (await getReader(page)).evaluate((reader, href) => {
    const index = reader.context.manifest.spineItems.findIndex((item) =>
      item.href.endsWith(href),
    )

    if (index < 0) throw new Error(`no ${href} in the book`)

    return index
  }, chapter)

/** The crengine pointer to the start of a spine item. */
const chapterStart = (spineItemIndex: number) =>
  `/body/DocFragment[${spineItemIndex + 1}]/body`

const goToSpineItem = async (page: Page, indexOrId: number) => {
  await (await getReader(page)).evaluate((reader, indexOrId) => {
    reader.navigation.goToSpineItem({ indexOrId, animation: false })
  }, indexOrId)
  await waitForSettled(page)
}

/** The xpointer of an element of a loaded spine item. */
const getElementXPointer = async (
  page: Page,
  spineItemIndex: number,
  id: string,
) =>
  (await getReader(page)).evaluate(
    (reader, { spineItemIndex, id }) => {
      // The page's window is untyped: this scenario's index.tsx sets these.
      const { koreader } = window as unknown as ScenarioHelpers
      const element = reader.spineItemsManager
        .get(spineItemIndex)
        ?.loadedDocument?.getElementById(id)

      if (!element) throw new Error(`no #${id} in a loaded document`)

      const xpointer = koreader.generateXPointer(
        { node: element },
        spineItemIndex,
      )

      if (!xpointer) throw new Error(`no xpointer for #${id}`)

      return xpointer
    },
    { spineItemIndex, id },
  )

const readReportedPositions = (page: Page) =>
  page.evaluate(() => {
    // The page's window is untyped: this scenario's index.tsx sets these.
    const { readingPositionsAsXPointers } = window as unknown as ScenarioHelpers

    return [...readingPositionsAsXPointers]
  })

const readLatestReportedPosition = async (page: Page) =>
  (await readReportedPositions(page)).slice(-1)[0]

/** The cfi an xpointer resolves to in its loaded spine item. */
const getXPointerCfi = async (page: Page, xpointer: string) =>
  (await getReader(page)).evaluate((reader, xpointer) => {
    // The page's window is untyped: this scenario's index.tsx sets these.
    const { koreader } = window as unknown as ScenarioHelpers

    return koreader.xPointerToCfi(xpointer, (spineItemIndex) => {
      const spineItem = reader.spineItemsManager.get(spineItemIndex)
      const document = spineItem?.loadedDocument

      return spineItem && document
        ? { document, id: spineItem.item.id }
        : undefined
    })
  }, xpointer)

/**
 * The xpointer of an element deep in the chapter, read in a session showing
 * the chapter, as a sync client would pull one.
 */
const readFragmentXPointer = async (page: Page) => {
  await page.goto(url)
  await waitForSettled(page)

  const chapterIndex = await getChapterIndex(page)

  await goToSpineItem(page, chapterIndex)

  const xpointer = await getElementXPointer(page, chapterIndex, fragment)

  // A place far into a chapter other than the first: neither the chapter's
  // start nor the book's.
  expect(chapterIndex).toBeGreaterThan(0)
  expect(xpointer).not.toBe(chapterStart(chapterIndex))

  return { chapterIndex, xpointer }
}

/**
 * The xpointer of an element deep in the chapter, read in one session, then a
 * fresh reader where the chapter is not loaded, going to it, recording the
 * positions reported from there on, once the last one is a success.
 */
const goToXPointerInUnloadedChapter = async (page: Page) => {
  const { chapterIndex, xpointer } = await readFragmentXPointer(page)

  // Only visible chapters load.
  await page.goto(`${url}?preload=0`)
  await waitForSettled(page)

  const before = (await readReportedPositions(page)).length
  const isChapterReady = await (await getReader(page)).evaluate(
    (reader, chapterIndex) =>
      reader.spineItemsManager.get(chapterIndex)?.value.isReady,
    chapterIndex,
  )

  expect(isChapterReady).toBe(false)

  await goToKoreaderProgress(page, xpointer)

  await expect
    .poll(() => isElementStartOnScreen(page, chapterIndex, fragment))
    .toBe(true)
  await expect
    .poll(async () => (await readLatestReportedPosition(page))?.status)
    .toBe("success")

  return {
    chapterIndex,
    xpointer,
    reported: (await readReportedPositions(page)).slice(before),
  }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 690, height: 1294 })
})

test.describe("Given an xpointer into a chapter not loaded yet", () => {
  test("going to it shows its place once the chapter loads", async ({
    page,
  }) => {
    const { reported } = await goToXPointerInUnloadedChapter(page)

    expect(reported.length).toBeGreaterThan(0)
  })

  test("the reported position is pending at the chapter start while it loads, and ends a success on the xpointer gone to", async ({
    page,
  }) => {
    const { chapterIndex, xpointer, reported } =
      await goToXPointerInUnloadedChapter(page)

    expect(reported.slice(-1)[0]).toEqual({ xpointer, status: "success" })

    for (const value of reported.slice(0, -1)) {
      expect(value.status).toBe("pending")
      expect([chapterStart(chapterIndex), xpointer]).toContain(value.xpointer)
    }

    expect(reported[0]).toEqual({
      xpointer: chapterStart(chapterIndex),
      status: "pending",
    })
  })
})

test.describe("Given a book opened at an xpointer into a chapter not loaded yet", () => {
  test("it is reported pending at the chapter start while the chapter loads, never at the start of the book, and ends a success on the xpointer, its place shown", async ({
    page,
  }) => {
    const { chapterIndex, xpointer } = await readFragmentXPointer(page)

    // Only visible chapters load.
    await page.goto(`${url}?preload=0&progress=${encodeURIComponent(xpointer)}`)
    await waitForSettled(page)

    // The first position reported, from the reader's creation on.
    expect((await readReportedPositions(page))[0]).toEqual({
      xpointer: chapterStart(chapterIndex),
      status: "pending",
    })

    await expect
      .poll(() => isElementStartOnScreen(page, chapterIndex, fragment))
      .toBe(true)
    await expect
      .poll(async () => (await readLatestReportedPosition(page))?.status)
      .toBe("success")

    const reported = await readReportedPositions(page)

    expect(reported.slice(-1)[0]).toEqual({ xpointer, status: "success" })

    for (const value of reported.slice(0, -1)) {
      expect(value.status).toBe("pending")
      expect([chapterStart(chapterIndex), xpointer]).toContain(value.xpointer)
    }
  })
})

test.describe("Given pages turned in a chapter", () => {
  test("the reported xpointer names what is shown", async ({ page }) => {
    await page.goto(url)
    await waitForSettled(page)

    const chapterIndex = await getChapterIndex(page)

    await goToSpineItem(page, chapterIndex)

    for (let turn = 0; turn < 2; turn++) {
      await (await getReader(page)).evaluate((reader) => {
        reader.navigation.turnRight()
      })
      await waitForSettled(page)
    }

    const latest = await readLatestReportedPosition(page)

    expect(latest?.status).toBe("success")
    expect(latest?.xpointer).not.toBe(chapterStart(chapterIndex))

    const cfi = await getXPointerCfi(page, latest?.xpointer ?? "")

    expect(cfi).toBeDefined()
    await expect.poll(() => isCfiPositionVisible(page, cfi ?? "")).toBe(true)
  })
})

test.describe("Given a book reopened at a cfi inside a chapter not loaded yet", () => {
  test("it is reported pending at the chapter start while the chapter loads, and ends a success on its place", async ({
    page,
  }) => {
    await page.goto(url)
    await waitForSettled(page)

    const chapterIndex = await getChapterIndex(page)

    await goToSpineItem(page, chapterIndex)
    await (await getReader(page)).evaluate((reader) => {
      reader.navigation.turnRight()
    })
    await waitForSettled(page)

    const cfi = await (await getReader(page)).evaluate((reader) => {
      let value: string | undefined

      reader.navigation.readingPosition$
        .subscribe(({ cfi }) => {
          value = cfi
        })
        .unsubscribe()

      return value === undefined
        ? undefined
        : { value, isRootCfi: reader.cfi.isRootCfi(value) }
    })

    // A place in the text, which only converts once its chapter has loaded.
    expect(cfi?.isRootCfi).toBe(false)

    await page.goto(
      `${url}?preload=0&cfi=${encodeURIComponent(cfi?.value ?? "")}`,
    )
    await waitForSettled(page)

    await expect
      .poll(async () => (await readLatestReportedPosition(page))?.status)
      .toBe("success")

    const reported = await readReportedPositions(page)
    const latest = reported.slice(-1)[0]?.xpointer ?? ""

    // Never the start of the book, and only the chapter's until it is a
    // success.
    expect(latest).not.toBe(chapterStart(chapterIndex))
    expect(reported[0]).toEqual({
      xpointer: chapterStart(chapterIndex),
      status: "pending",
    })
    for (const value of reported.slice(0, -1)) {
      expect(value.status).toBe("pending")
      expect([chapterStart(chapterIndex), latest]).toContain(value.xpointer)
    }
    expect(await getXPointerCfi(page, latest)).toBeDefined()
    await expect
      .poll(async () => isCfiPositionVisible(page, cfi?.value ?? ""))
      .toBe(true)
  })
})

test.describe("Given an xpointer into a chapter where its place cannot be found", () => {
  test("once the chapter loads, the reported xpointer is where the reader is, not the one it could not find", async ({
    page,
  }) => {
    // Only visible chapters load.
    await page.goto(`${url}?preload=0`)
    await waitForSettled(page)

    const chapterIndex = await getChapterIndex(page)
    // A path no element of the chapter has, as a stale pointer can.
    const xpointer = `${chapterStart(chapterIndex)}/div[999]/p[3]/text().0`

    await goToKoreaderProgress(page, xpointer)

    await expect
      .poll(async () =>
        (await getReader(page)).evaluate(
          (reader, chapterIndex) =>
            reader.spineItemsManager.get(chapterIndex)?.value.loadStatus,
          chapterIndex,
        ),
      )
      .toBe("loaded")

    await expect
      .poll(async () => (await readLatestReportedPosition(page))?.status)
      .toBe("success")

    const latest = (await readLatestReportedPosition(page))?.xpointer ?? ""

    expect(latest).not.toBe(xpointer)

    const cfi = await getXPointerCfi(page, latest)

    expect(cfi).toBeDefined()
    expect(await isCfiPositionVisible(page, cfi ?? "")).toBe(true)
  })
})

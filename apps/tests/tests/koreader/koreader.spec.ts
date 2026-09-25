import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import type { koreaderEnhancer } from "@prose-reader/enhancer-koreader"
import type { generateXPointer, xPointerToCfi } from "@prose-reader/koreader"
import { waitForSettled } from "../utils/pagination"
import {
  isCfiPositionVisible,
  isElementStartOnScreen,
} from "../utils/visibility"

/**
 * A KOReader sync client pulls an xpointer, goes to it, and pushes the reading
 * position back as an xpointer. Going to one must reach its place even in a
 * chapter that is not loaded yet, and what is pushed back must never be less
 * precise than what the reader is on, or it overwrites a better position on
 * the server.
 */

const url = "http://localhost:3333/tests/koreader/index.html"

const chapter = "ch02.xhtml"
// Near the end of a long chapter, many pages after its start.
const fragment = "_page_numbering"

type KoreaderReader = ReturnType<ReturnType<typeof koreaderEnhancer>> & Reader

type Scenario = {
  reader: KoreaderReader
  xpointers: string[]
  koreader: {
    generateXPointer: typeof generateXPointer
    xPointerToCfi: typeof xPointerToCfi
  }
}

const getChapterIndex = (page: Page) =>
  page.evaluate((href) => {
    // The page's window is untyped: this scenario's index.tsx sets these.
    const { reader } = window as unknown as Scenario
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
  await page.evaluate((indexOrId) => {
    // The page's window is untyped: this scenario's index.tsx sets these.
    const { reader } = window as unknown as Scenario

    reader.navigation.goToSpineItem({ indexOrId, animation: false })
  }, indexOrId)
  await waitForSettled(page)
}

/** The xpointer of an element of a loaded spine item. */
const getElementXPointer = (page: Page, spineItemIndex: number, id: string) =>
  page.evaluate(
    ({ spineItemIndex, id }) => {
      // The page's window is untyped: this scenario's index.tsx sets these.
      const { reader, koreader } = window as unknown as Scenario
      const element = reader.spineItemsManager
        .get(spineItemIndex)
        ?.renderer.getDocumentFrame()
        ?.contentDocument?.getElementById(id)

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

const readXPointers = (page: Page) =>
  page.evaluate(() => {
    // The page's window is untyped: this scenario's index.tsx sets these.
    const { xpointers } = window as unknown as Scenario

    return [...xpointers]
  })

/** The cfi an xpointer resolves to in its loaded spine item. */
const getXPointerCfi = (page: Page, xpointer: string) =>
  page.evaluate((xpointer) => {
    // The page's window is untyped: this scenario's index.tsx sets these.
    const { reader, koreader } = window as unknown as Scenario

    return koreader.xPointerToCfi(xpointer, (spineItemIndex) => {
      const spineItem = reader.spineItemsManager.get(spineItemIndex)
      const document = spineItem?.renderer.getDocumentFrame()?.contentDocument

      return spineItem && document
        ? { document, id: spineItem.item.id }
        : undefined
    })
  }, xpointer)

/**
 * The xpointer of an element deep in the chapter, read in one session, then a
 * fresh reader where the chapter is not loaded, recording the xpointers
 * reported from there on.
 */
const openAtXPointerInUnloadedChapter = async (page: Page) => {
  await page.goto(url)
  await waitForSettled(page)

  const chapterIndex = await getChapterIndex(page)

  await goToSpineItem(page, chapterIndex)

  const xpointer = await getElementXPointer(page, chapterIndex, fragment)

  // Only visible chapters load.
  await page.goto(`${url}?preload=0`)
  await waitForSettled(page)

  const before = (await readXPointers(page)).length
  const isChapterReady = await page.evaluate((chapterIndex) => {
    // The page's window is untyped: this scenario's index.tsx sets these.
    const { reader } = window as unknown as Scenario

    return reader.spineItemsManager.get(chapterIndex)?.value.isReady
  }, chapterIndex)

  expect(isChapterReady).toBe(false)

  await page.evaluate((xpointer) => {
    // The page's window is untyped: this scenario's index.tsx sets these.
    const { reader } = window as unknown as Scenario

    reader.navigation.goToXPointer(xpointer)
  }, xpointer)
  await waitForSettled(page)

  await expect
    .poll(() => isElementStartOnScreen(page, chapterIndex, fragment))
    .toBe(true)

  return {
    chapterIndex,
    xpointer,
    reported: (await readXPointers(page)).slice(before),
  }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 690, height: 1294 })
})

test.describe("Given an xpointer into a chapter not loaded yet", () => {
  test("going to it shows its place once the chapter loads", async ({
    page,
  }) => {
    const { reported } = await openAtXPointerInUnloadedChapter(page)

    expect(reported.length).toBeGreaterThan(0)
  })

  test("the reported xpointer is the one gone to, never the chapter start while it loads", async ({
    page,
  }) => {
    const { chapterIndex, xpointer, reported } =
      await openAtXPointerInUnloadedChapter(page)

    expect(reported).not.toContain(chapterStart(chapterIndex))
    expect(reported).toEqual([xpointer])
  })
})

test.describe("Given pages turned in a chapter", () => {
  test("the reported xpointer names what is shown", async ({ page }) => {
    await page.goto(url)
    await waitForSettled(page)

    const chapterIndex = await getChapterIndex(page)

    await goToSpineItem(page, chapterIndex)

    for (let turn = 0; turn < 2; turn++) {
      await page.evaluate(() => {
        // The page's window is untyped: this scenario's index.tsx sets these.
        const { reader } = window as unknown as Scenario

        reader.navigation.turnRight()
      })
      await waitForSettled(page)
    }

    const latest = (await readXPointers(page)).slice(-1)[0]

    expect(latest).toBeDefined()
    expect(latest).not.toBe(chapterStart(chapterIndex))

    const cfi = await getXPointerCfi(page, latest ?? "")

    expect(cfi).toBeDefined()
    await expect.poll(() => isCfiPositionVisible(page, cfi ?? "")).toBe(true)
  })
})

test.describe("Given a book reopened at a cfi inside a chapter not loaded yet", () => {
  test("the only xpointer reported is its place, once the chapter loads", async ({
    page,
  }) => {
    await page.goto(url)
    await waitForSettled(page)

    const chapterIndex = await getChapterIndex(page)

    await goToSpineItem(page, chapterIndex)
    await page.evaluate(() => {
      // The page's window is untyped: this scenario's index.tsx sets these.
      const { reader } = window as unknown as Scenario

      reader.navigation.turnRight()
    })
    await waitForSettled(page)

    const cfi = await page.evaluate(() => {
      // The page's window is untyped: this scenario's index.tsx sets these.
      const { reader } = window as unknown as Scenario
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
      .poll(async () => (await readXPointers(page)).slice(-1)[0])
      .not.toBe(undefined)

    const reported = await readXPointers(page)
    const latest = reported.slice(-1)[0] ?? ""

    // Neither the start of the book nor the chapter's before it.
    expect(reported).toEqual([latest])
    expect(latest).not.toBe(chapterStart(chapterIndex))
    expect(await getXPointerCfi(page, latest)).toBeDefined()
    await expect
      .poll(async () => isCfiPositionVisible(page, cfi?.value ?? ""))
      .toBe(true)
  })
})

test.describe("Given a book opened at an xpointer inside a chapter not loaded yet", () => {
  test("it opens at its place, and the only xpointer reported is that one", async ({
    page,
  }) => {
    await page.goto(url)
    await waitForSettled(page)

    const chapterIndex = await getChapterIndex(page)

    await goToSpineItem(page, chapterIndex)

    const xpointer = await getElementXPointer(page, chapterIndex, fragment)

    // Only visible chapters load.
    await page.goto(`${url}?preload=0&xpointer=${encodeURIComponent(xpointer)}`)
    await waitForSettled(page)

    await expect
      .poll(() => isElementStartOnScreen(page, chapterIndex, fragment))
      .toBe(true)

    // Neither the start of the book nor the chapter's while it loads.
    expect(await readXPointers(page)).toEqual([xpointer])
  })
})

test.describe("Given a book opened at an xpointer outside it", () => {
  test("it opens at the start of the book", async ({ page }) => {
    await page.goto(
      `${url}?xpointer=${encodeURIComponent("/body/DocFragment[999]/body")}`,
    )
    await waitForSettled(page)

    const spineItem = await page.evaluate(() => {
      // The page's window is untyped: this scenario's index.tsx sets these.
      const { reader } = window as unknown as Scenario

      return reader.navigation.getNavigation().spineItem
    })

    expect(spineItem).toBe(0)
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

    await page.evaluate((xpointer) => {
      // The page's window is untyped: this scenario's index.tsx sets these.
      const { reader } = window as unknown as Scenario

      reader.navigation.goToXPointer(xpointer)
    }, xpointer)
    await waitForSettled(page)

    await expect
      .poll(() =>
        page.evaluate((chapterIndex) => {
          // The page's window is untyped: this scenario's index.tsx sets these.
          const { reader } = window as unknown as Scenario

          return reader.spineItemsManager.get(chapterIndex)?.value.isLoaded
        }, chapterIndex),
      )
      .toBe(true)

    await expect
      .poll(async () => (await readXPointers(page)).slice(-1)[0])
      .not.toBe(xpointer)

    const latest = (await readXPointers(page)).slice(-1)[0] ?? ""
    const cfi = await getXPointerCfi(page, latest)

    expect(cfi).toBeDefined()
    expect(await isCfiPositionVisible(page, cfi ?? "")).toBe(true)
  })
})

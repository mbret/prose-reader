import { expect, test } from "@playwright/test"
import { updateSettings } from "../../utils"
import {
  nextRestoration,
  waitForSettled,
  waitForSettledOnCurrentLayout,
} from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import { isCfiPositionVisible } from "../../utils/visibility"

const url = "http://localhost:3333/tests/layout/fonts/index.html"
const chapterCfi = "epubcfi(/6/14!/4/2)"
const chapterSpineItemIndex = 6

test.describe("Given a reflowable chapter on screen", () => {
  test("should lay the chapter out again when its font scale changes with a setting of another enhancer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 536, height: 842 })
    await page.goto(`${url}?cfi=${encodeURIComponent(chapterCfi)}`)
    await waitForSettledOnCurrentLayout(page)

    const reader = await getReader(page)
    const getNumberOfPagesOfChapter = () =>
      reader.evaluate(
        (reader, spineItemIndex) =>
          reader.spineItemsManager.get(spineItemIndex)?.numberOfPages,
        chapterSpineItemIndex,
      )

    const chapterBeforeUpdate = await reader.evaluate((reader) => ({
      spineItemIndex: reader.pagination.state.begin.spineItemIndex,
      layoutLayerTransition: reader.settings.values.layoutLayerTransition,
    }))

    expect(chapterBeforeUpdate).toEqual({
      spineItemIndex: chapterSpineItemIndex,
      layoutLayerTransition: false,
    })

    const numberOfPagesAtFontScale1 = await getNumberOfPagesOfChapter()

    if (numberOfPagesAtFontScale1 === undefined) {
      throw new Error(`the chapter is not laid out`)
    }

    // `layoutLayerTransition` lays nothing out by itself, so it cannot hide a
    // font scale change that fails to lay the chapter out.
    await updateSettings({
      page,
      settings: { layoutLayerTransition: true, fontScale: 2 },
    })

    await expect
      .poll(getNumberOfPagesOfChapter)
      .toBeGreaterThan(numberOfPagesAtFontScale1)
  })
})

/**
 * The reader cuts a reflowable chapter into pages. A setting that fits more
 * text on a page moves text to earlier pages, and can keep the chapter's page
 * count, and so its size. Each browser keeps the count at another step, so the
 * steps go on from one another.
 */
test.describe("Given a reflowable chapter on a page after its first", () => {
  const longChapterSpineItemIndex = 11
  const cases = [
    {
      setting: "font scale",
      steps: [{ fontScale: 0.99 }, { fontScale: 0.98 }, { fontScale: 0.97 }],
    },
    {
      setting: "page margin",
      steps: [
        { pageHorizontalMargin: 23 },
        { pageHorizontalMargin: 22 },
        { pageHorizontalMargin: 21 },
      ],
    },
  ]

  for (const { setting, steps } of cases) {
    test(`should keep the reading position on screen as a smaller ${setting} moves the text`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 536, height: 842 })
      await page.goto(
        `${url}?cfi=${encodeURIComponent(`epubcfi(/6/${(longChapterSpineItemIndex + 1) * 2}!)`)}`,
      )
      await waitForSettledOnCurrentLayout(page)

      const reader = await getReader(page)
      const getNumberOfPagesOfChapter = () =>
        reader.evaluate(
          (reader, spineItemIndex) =>
            reader.spineItemsManager.get(spineItemIndex)?.numberOfPages,
          longChapterSpineItemIndex,
        )

      for (const _ of Array.from({ length: 10 })) {
        await reader.evaluate((reader) => {
          reader.navigation.turnRight()
        })
        await waitForSettled(page)
      }

      const readingPositionCfi = await reader.evaluate((reader) => {
        let cfi: string | undefined

        reader.navigation.readingPosition$
          .subscribe((readingPosition) => {
            cfi = readingPosition.cfi
          })
          .unsubscribe()

        return cfi
      })

      if (!readingPositionCfi)
        throw new Error("the reader has no reading position")

      expect(
        await reader.evaluate(({ pagination }) => ({
          spineItemIndex: pagination.state.begin.spineItemIndex,
          pageIndexInSpineItem: pagination.state.begin.pageIndexInSpineItem,
        })),
      ).toEqual({
        spineItemIndex: longChapterSpineItemIndex,
        pageIndexInSpineItem: 10,
      })
      expect(await isCfiPositionVisible(page, readingPositionCfi)).toBe(true)

      let numberOfPages = await getNumberOfPagesOfChapter()
      let stepsThatKeptTheNumberOfPages = 0

      for (const settings of steps) {
        const restored = await nextRestoration(page)

        await reader.evaluate((reader, settings) => {
          reader.settings.update(settings)
        }, settings)
        await restored()

        // The restoration may still be landing on screen.
        await expect
          .poll(() => isCfiPositionVisible(page, readingPositionCfi), {
            message: `the reading position after ${JSON.stringify(settings)}`,
          })
          .toBe(true)

        const numberOfPagesAfterStep = await getNumberOfPagesOfChapter()

        if (numberOfPagesAfterStep === numberOfPages) {
          stepsThatKeptTheNumberOfPages++
        }

        numberOfPages = numberOfPagesAfterStep
      }

      // A step that changes the number of pages changes the chapter's size,
      // which the reader always restored from the cfi.
      expect(
        stepsThatKeptTheNumberOfPages,
        "the steps that kept the chapter's number of pages",
      ).toBeGreaterThan(0)
    })
  }
})

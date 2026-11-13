// @vitest-environment jsdom
import { firstValueFrom } from "rxjs"
import { describe, expect, it } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  defaultTestViewport,
  installReaderTestEnvironment,
  mountTestReader,
  renderItemsOfSetSizes,
  renderTextDocumentsWithParagraphOnSetPage,
  settledOn,
  stubElementScrolling,
} from "../tests/readerHarness"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../tests/utils"

installReaderTestEnvironment()

/**
 * A book of four pages, one item each, opened on its third page, whose first
 * page a test can make larger, as a spine item that loads before the one on
 * screen does. Every page after it then moves by as much at the next layout.
 */
const openOnThirdPage = async (
  options: Parameters<typeof createTestReader>[0] = {},
) => {
  stubElementScrolling()

  const { getRenderer, setItemSize } = renderItemsOfSetSizes()
  const reader = createTestReader({
    manifest: createPrePaginatedManifest({
      pageSpreads: [undefined, undefined, undefined, undefined],
    }),
    getRenderer,
    ...options,
  })

  mountTestReader(reader)
  await settledOn(reader, 0)
  reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })
  await settledOn(reader, 2)

  return {
    reader,
    setSizeOfFirstPage: (size: Parameters<typeof setItemSize>[1]) =>
      setItemSize(0, size),
  }
}

describe("Given a layout that moves the spine item the navigation shows", () => {
  describe("When the pages turn", () => {
    it("restores the navigation in the task that lays the spine items out, before the pages are published", async () => {
      const { reader, setSizeOfFirstPage } = await openOnThirdPage()
      const { width: pageWidth } = defaultTestViewport

      expect(reader.navigation.getNavigation().position.x).toBe(2 * pageWidth)

      // The first page becomes two pages wide: the third one moves by a page.
      setSizeOfFirstPage({ width: 2 * pageWidth })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(reader.spine.isLayoutCurrent()).toBe(false)
      expect(reader.navigation.getNavigation()).toMatchObject({
        position: { x: 3 * pageWidth, y: 0 },
        spineItem: 2,
      })

      // The restoration that follows the pages leaves it there.
      await settledOn(reader, 2)

      expect(reader.navigation.getNavigation().position.x).toBe(3 * pageWidth)
    })
  })

  describe("When the book scrolls", () => {
    it("restores the navigation in the task that lays the spine items out, before the pages are published", async () => {
      const { reader, setSizeOfFirstPage } = await openOnThirdPage({
        pageTurnMode: "scrollable",
      })
      const { height: pageHeight } = defaultTestViewport
      const scrollElement =
        reader.navigation.scrollNavigationController.value.element

      expect(scrollElement?.scrollTop).toBe(2 * pageHeight)

      // The first page grows by 300: the third one moves down by as much.
      setSizeOfFirstPage({ height: pageHeight + 300 })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(reader.spine.isLayoutCurrent()).toBe(false)
      expect(scrollElement?.scrollTop).toBe(2 * pageHeight + 300)
      expect(reader.navigation.getNavigation()).toMatchObject({
        position: { x: 0, y: 2 * pageHeight + 300 },
        spineItem: 2,
      })

      await settledOn(reader, 2)

      expect(scrollElement?.scrollTop).toBe(2 * pageHeight + 300)
    })
  })
})

describe("Given a layout that keeps the place and size of the spine item the navigation shows, and moves its text to another page", () => {
  it("restores the navigation in the task that lays the spine items out, before the pages are published", async () => {
    const { getRenderer, setPageIndexOfParagraph } =
      renderTextDocumentsWithParagraphOnSetPage()
    const { width: pageWidth } = defaultTestViewport

    /**
     * A book of two chapters, three pages each, opened on the paragraph of
     * the second one, which is on that chapter's second page.
     */
    setPageIndexOfParagraph(1)

    const reader = createTestReader({
      manifest: createTestManifest({
        spineItems: createTestManifestSpineItems(2),
      }),
      getRenderer,
      target: { type: "cfi", value: "epubcfi(/6/4[item-1]!/4/2/1:0)" },
    })

    mountTestReader(reader)
    await settledOn(reader, 1)

    const getPlaceAndSizeOfSecondChapter = () =>
      reader.spine.getSpineItemSpineLayoutInfo(1)
    const placeAndSizeOfSecondChapterBeforeLayout =
      getPlaceAndSizeOfSecondChapter()

    expect(reader.navigation.getNavigation().position.x).toBe(4 * pageWidth)

    // The text moves by a page, as with a larger font that keeps the page count.
    setPageIndexOfParagraph(2)
    reader.layout()
    await firstValueFrom(reader.spine.itemsLayout$)

    expect(reader.spine.isLayoutCurrent()).toBe(false)
    expect(getPlaceAndSizeOfSecondChapter()).toEqual(
      placeAndSizeOfSecondChapterBeforeLayout,
    )
    expect(reader.navigation.getNavigation().position.x).toBe(5 * pageWidth)

    // The restoration that follows the pages leaves it there.
    await settledOn(reader, 1)

    expect(reader.navigation.getNavigation().position.x).toBe(5 * pageWidth)
  })
})

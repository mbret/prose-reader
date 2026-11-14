// @vitest-environment jsdom
import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import {
  createEnhancedTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "../../tests/readerHarness"
import { createTestManifest } from "../../tests/utils"

installReaderTestEnvironment()

const BASE_MANIFEST = createTestManifest({
  filename: "",
  title: "",
  renditionLayout: "pre-paginated",
  renditionSpread: "auto",
})

describe("Given a book that has not been laid out yet", () => {
  /**
   * The core already places the edges on an estimate by then, the start of
   * the first item. What the enhancer adds waits for a layout.
   */
  it(`should not claim a page, a chapter or a direction on either edge`, () => {
    const reader = createEnhancedTestReader({
      manifest: {
        ...BASE_MANIFEST,
        spineItems: [
          {
            href: "/chapter_1/page_1.jpg",
            containerUri: "chapter_1/page_1.jpg",
            id: "1",
            pageSpreadLeft: true,
            pageSpreadRight: true,
            progressionWeight: 0,
            renditionLayout: "pre-paginated",
            index: 0,
          },
        ],
      },
    })

    const { state } = reader.pagination

    expect(state).toMatchObject({
      isSettled: false,
      numberOfTotalPages: 0,
      percentageEstimateOfBook: 0,
    })

    for (const edge of [state.begin, state.end]) {
      expect(edge).toMatchObject({
        absolutePageIndex: undefined,
        chapterInfo: undefined,
        spineItemReadingDirection: undefined,
      })
    }
  })
})

describe("Given a book with one chapter", () => {
  describe(`when we navigate to first page`, () => {
    it(`should return first chapter`, async () => {
      const reader = createEnhancedTestReader({
        manifest: {
          ...BASE_MANIFEST,
          nav: {
            toc: [
              {
                contents: [],
                href: "/chapter_1/page_1.jpg",
                path: "/chapter_1/page_1.jpg",
                title: "Chapter 1",
              },
            ],
          },
          spineItems: [
            {
              href: "/chapter_1/page_1.jpg",
              containerUri: "chapter_1/page_1.jpg",
              id: "1",
              pageSpreadLeft: true,
              pageSpreadRight: true,
              progressionWeight: 0,
              renditionLayout: "pre-paginated",
              index: 0,
            },
          ],
        },
      })

      mountTestReader(reader)

      const { begin } = await settledOn(reader, 0)

      expect(begin.chapterInfo).toEqual({
        path: "/chapter_1/page_1.jpg",
        title: "Chapter 1",
      })
    })
  })

  describe("when we navigate to second page", () => {
    it(`should return first chapter`, async () => {
      const reader = createEnhancedTestReader({
        manifest: {
          ...BASE_MANIFEST,
          nav: {
            toc: [
              {
                contents: [],
                href: "/chapter_1/page_1.jpg",
                path: "/chapter_1/page_1.jpg",
                title: "Chapter 1",
              },
            ],
          },
          spineItems: [
            {
              href: "/chapter_1/page_1.jpg",
              containerUri: "chapter_1/page_1.jpg",
              id: "1",
              pageSpreadLeft: true,
              pageSpreadRight: true,
              progressionWeight: 0,
              renditionLayout: "pre-paginated",
              index: 0,
            },
            {
              href: "/chapter_1/page_2.jpg",
              containerUri: "chapter_1/page_2.jpg",
              id: "2",
              pageSpreadLeft: true,
              pageSpreadRight: true,
              progressionWeight: 0,
              renditionLayout: "pre-paginated",
              index: 1,
            },
          ],
        },
      })

      mountTestReader(reader)
      reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

      const { begin } = await settledOn(reader, 1)

      expect(begin.chapterInfo).toEqual({
        path: "/chapter_1/page_1.jpg",
        title: "Chapter 1",
      })
    })
  })

  describe("and contain inner chapter", () => {
    describe(`when we are on first page`, () => {
      describe("and the first page is within first chapter sub chapter", () => {
        it(`should return correct chapter with its subChapter info filled`, async () => {
          const reader = createEnhancedTestReader({
            manifest: {
              ...BASE_MANIFEST,
              nav: {
                toc: [
                  {
                    contents: [
                      {
                        contents: [],
                        href: "http://localhost:9000/streamer/book/OEBPS/part0006.xhtml",
                        path: "OEBPS/part0006.xhtml",
                        title: "Chapter 1",
                      },
                    ],
                    href: "http://localhost:9000/streamer/book/OEBPS/part0006.xhtml",
                    path: "OEBPS/part0006.xhtml",
                    title: "Part 1",
                  },
                ],
              },
              spineItems: [
                {
                  href: "http://localhost:9000/streamer/book/OEBPS/part0006.xhtml",
                  containerUri: "OEBPS/part0006.xhtml",
                  id: "part0006.xhtml",
                  pageSpreadLeft: true,
                  pageSpreadRight: true,
                  progressionWeight: 0,
                  renditionLayout: "pre-paginated",
                  index: 0,
                },
              ],
            },
          })

          mountTestReader(reader)

          const { begin } = await settledOn(reader, 0)

          expect(begin.chapterInfo).toEqual({
            path: "OEBPS/part0006.xhtml",
            title: "Part 1",
            subChapter: { title: "Chapter 1", path: "OEBPS/part0006.xhtml" },
          })
        })
      })
    })
  })
})

describe("Given a book with two chapters", () => {
  const manifest: Manifest = {
    ...BASE_MANIFEST,
    nav: {
      toc: [
        {
          contents: [],
          href: "/OPS/page_1.jpg",
          path: "/OPS/page_1.jpg",
          title: "Chapter 1",
        },
        {
          contents: [],
          href: "/OPS/page_2.jpg",
          path: "/OPS/page_2.jpg",
          title: "Chapter 2",
        },
      ],
    },
    spineItems: [
      {
        href: "/OPS/page_1.jpg",
        containerUri: "OPS/page_1.jpg",
        id: "1",
        pageSpreadLeft: true,
        pageSpreadRight: true,
        progressionWeight: 0,
        renditionLayout: "pre-paginated",
        index: 0,
      },
      {
        href: "/OPS/page_2.jpg",
        containerUri: "OPS/page_2.jpg",
        id: "2",
        pageSpreadLeft: true,
        pageSpreadRight: true,
        progressionWeight: 0,
        renditionLayout: "pre-paginated",
        index: 1,
      },
    ],
  }

  describe("when we navigate to the first page which is in first chapter", () => {
    it(`should return chapter 1`, async () => {
      const reader = createEnhancedTestReader({ manifest })

      mountTestReader(reader)

      const { begin } = await settledOn(reader, 0)

      expect(begin.chapterInfo).toEqual({
        path: "/OPS/page_1.jpg",
        title: "Chapter 1",
      })
    })
  })

  describe("when we navigate to a page that is in a second chapter", () => {
    it(`should name the chapter of the page each result begins on, settled or not`, async () => {
      const chapterBySpineItemIndex = [
        { path: "/OPS/page_1.jpg", title: "Chapter 1" },
        { path: "/OPS/page_2.jpg", title: "Chapter 2" },
      ]
      const reader = createEnhancedTestReader({ manifest })

      const results: (typeof reader.pagination.state)[] = []
      reader.pagination.state$.subscribe((result) => {
        results.push(result)
      })

      mountTestReader(reader)
      reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

      await settledOn(reader, 1)

      const [resultBeforeLayout, ...laidOutResults] = results

      expect(resultBeforeLayout?.begin.chapterInfo).toBeUndefined()

      for (const { begin } of laidOutResults) {
        const expectedChapter =
          begin.spineItemIndex === undefined
            ? undefined
            : chapterBySpineItemIndex[begin.spineItemIndex]

        expect(begin.chapterInfo).toEqual(expectedChapter)
      }
    })
  })
})

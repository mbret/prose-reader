import { Manifest } from "@prose-reader/shared"
import { ObservedValueOf, skip } from "rxjs"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createReader } from "../reader"
import { paginationEnhancer } from "./pagination"
import { progressionEnhancer } from "./progression"

window.__PROSE_READER_DEBUG = false

const BASE_MANIFEST: Manifest = {
  filename: "",
  items: [],
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "auto",
  spineItems: [],
  title: "",
}

beforeEach(async () => {
  const containerElement = document.createElement("div")
  containerElement.id = "test-container"
  document.body.appendChild(containerElement)
})

afterEach(() => {
  document.getElementById("test-container")?.remove()
})

describe("Given a book with one chapter", () => {
  describe(`when we navigate to first page`, () => {
    it(`should return first chapter`, async () => {
      const reader = paginationEnhancer(progressionEnhancer(createReader))({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        containerElement: document.getElementById("test-container")!,
      })

      const value = await new Promise<ObservedValueOf<typeof reader.pagination$>>((resolve, reject) => {
        reader.pagination$.pipe(skip(1)).subscribe({
          next: resolve,
          error: reject,
        })

        reader.load(
          {
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
                id: "1",
                pageSpreadLeft: true,
                pageSpreadRight: true,
                progressionWeight: 0,
                renditionLayout: "pre-paginated",
              },
            ],
          },
          {
            fetchResource: async () => {
              return new Response("", { status: 200 })
            },
          }
        )
      })

      expect(value.beginChapterInfo).toEqual({
        path: "/chapter_1/page_1.jpg",
        title: "Chapter 1",
      })
    })
  })

  describe("when we navigate to second page", () => {
    it(`should return first chapter`, async () => {
      const reader = paginationEnhancer(progressionEnhancer(createReader))({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        containerElement: document.getElementById("test-container")!,
      })

      const value = await new Promise<ObservedValueOf<typeof reader.pagination$>>((resolve, reject) => {
        reader.pagination$.pipe(skip(1)).subscribe({
          next: resolve,
          error: reject,
        })

        reader.load(
          {
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
                id: "1",
                pageSpreadLeft: true,
                pageSpreadRight: true,
                progressionWeight: 0,
                renditionLayout: "pre-paginated",
              },
              {
                href: "/chapter_1/page_2.jpg",
                id: "2",
                pageSpreadLeft: true,
                pageSpreadRight: true,
                progressionWeight: 0,
                renditionLayout: "pre-paginated",
              },
            ],
          },
          {
            fetchResource: async () => {
              return new Response("", { status: 200 })
            },
          }
        )

        reader.goToSpineItem(1)
      })

      expect(value.beginChapterInfo).toEqual({
        path: "/chapter_1/page_1.jpg",
        title: "Chapter 1",
      })
    })
  })
})

describe("Given a book with two chapters", () => {
  describe("when we navigate to the first page which is in first chapter", () => {
    it(`should return chapter 1`, async () => {
      const reader = paginationEnhancer(progressionEnhancer(createReader))({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        containerElement: document.getElementById("test-container")!,
      })

      const value = await new Promise<ObservedValueOf<typeof reader.pagination$>>((resolve, reject) => {
        reader.pagination$.pipe(skip(1)).subscribe({
          next: resolve,
          error: reject,
        })

        reader.load(
          {
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
                id: "1",
                pageSpreadLeft: true,
                pageSpreadRight: true,
                progressionWeight: 0,
                renditionLayout: "pre-paginated",
              },
              {
                href: "/OPS/page_2.jpg",
                id: "2",
                pageSpreadLeft: true,
                pageSpreadRight: true,
                progressionWeight: 0,
                renditionLayout: "pre-paginated",
              },
            ],
          },
          {
            fetchResource: async () => {
              return new Response("", { status: 200 })
            },
          }
        )
      })

      expect(value.beginChapterInfo).toEqual({
        path: "/OPS/page_1.jpg",
        title: "Chapter 1",
      })
    })
  })

  describe("when we navigate to a page that is in a second chapter", () => {
    it(`return chapter 2`, async () => {
      const reader = paginationEnhancer(progressionEnhancer(createReader))({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        containerElement: document.getElementById("test-container")!,
      })

      const value = await new Promise<ObservedValueOf<typeof reader.pagination$>>((resolve, reject) => {
        reader.pagination$.pipe(skip(2)).subscribe({
          next: resolve,
          error: reject,
        })

        reader.load(
          {
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
                id: "1",
                pageSpreadLeft: true,
                pageSpreadRight: true,
                progressionWeight: 0,
                renditionLayout: "pre-paginated",
              },
              {
                href: "/OPS/page_2.jpg",
                id: "2",
                pageSpreadLeft: true,
                pageSpreadRight: true,
                progressionWeight: 0,
                renditionLayout: "pre-paginated",
              },
            ],
          },
          {
            fetchResource: async () => {
              return new Response("", { status: 200 })
            },
          }
        )

        reader.goToSpineItem(1)
      })

      expect(value.beginChapterInfo).toEqual({
        path: "/OPS/page_2.jpg",
        title: "Chapter 2",
      })
    })
  })
})
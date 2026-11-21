/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { createReader, type Manifest } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { NEVER } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ReactReader } from "../ReactReader.tsx"
import { ReactReaderProvider } from "../ReactReaderProvider.tsx"

const BOOK_WITH_ONE_CHAPTER_IN_ITS_TABLE_OF_CONTENTS: Manifest = {
  filename: `book.epub`,
  mediaType: `application/epub+zip`,
  title: `Book`,
  renditionLayout: `pre-paginated`,
  renditionSpread: undefined,
  readingDirection: `ltr`,
  nav: {
    toc: [
      {
        title: `Chapter 1`,
        path: `chapter-1.xhtml`,
        href: `chapter-1.xhtml`,
        contents: [],
      },
    ],
  },
  spineItems: [
    {
      id: `chapter-1`,
      href: `chapter-1.xhtml`,
      containerUri: `chapter-1.xhtml`,
      index: 0,
      renditionLayout: `pre-paginated`,
      progressionWeight: 0,
    },
  ],
  items: [],
}

const createAppReader = gesturesEnhancer(createReader)

type AppReader = ReturnType<typeof createAppReader>

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement(`div`)
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
  container.remove()
})

const openTableOfContents = async () => {
  let reader: AppReader | undefined

  const createBookReader = () => {
    reader = createAppReader({
      manifest: BOOK_WITH_ONE_CHAPTER_IN_ITS_TABLE_OF_CONTENTS,
      getResource: () => NEVER,
    })

    return reader
  }

  await act(async () => {
    root.render(
      <ChakraProvider value={defaultSystem}>
        <ReactReaderProvider createReader={createBookReader}>
          <ReactReader quickMenuOpen />
        </ReactReaderProvider>
      </ChakraProvider>,
    )
  })

  const tableOfContentsButton = document.querySelector<HTMLElement>(
    `button[aria-label="Table of contents"]`,
  )

  if (!reader || !tableOfContentsButton) {
    throw new Error("react-reader shows no reader with a table of contents")
  }

  await act(async () => {
    tableOfContentsButton.click()
  })

  return reader
}

describe("a row of the table of contents", () => {
  it("navigates the reader to its chapter, and leaves the URL of the page as it was", async () => {
    const reader = await openTableOfContents()
    const goToUrl = vi.spyOn(reader.navigation, "goToUrl")
    const pageUrlBeforeTheClick = window.location.href
    const row = document.querySelector<HTMLElement>(`[role="dialog"] li button`)

    if (!row) throw new Error("the table of contents lists no row")

    await act(async () => {
      row.click()
    })

    expect({
      navigatedTo: goToUrl.mock.calls,
      pageUrl: window.location.href,
    }).toEqual({
      navigatedTo: [[`chapter-1.xhtml`]],
      pageUrl: pageUrlBeforeTheClick,
    })
  })
})

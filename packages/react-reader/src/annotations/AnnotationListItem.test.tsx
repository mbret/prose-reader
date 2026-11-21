/* @vitest-environment jsdom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import type { RuntimeAnnotation } from "@prose-reader/enhancer-annotations"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { filter, firstValueFrom } from "rxjs"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { ReaderContextProvider } from "../context/ReaderContextProvider.tsx"
import { ReaderInContext } from "../tests/ReaderInContext.tsx"
import {
  installJsdomLayout,
  mountTextDocumentReader,
  type TextDocumentReader,
} from "../tests/textDocumentReader.ts"
import { AnnotationsList } from "./AnnotationsList.tsx"

installJsdomLayout()

/**
 * A highlight of the first page whose range is collapsed inside its
 * paragraph: it holds no text, and starts in a node that holds the text of
 * the whole paragraph.
 */
const createHighlightWithNoText = (
  reader: TextDocumentReader,
  id: string,
): RuntimeAnnotation => {
  const spineItem = reader.spineItemsManager.get(0)
  const paragraphText = spineItem?.renderer
    .getDocumentFrame()
    ?.contentDocument?.querySelector("p")?.firstChild

  if (!spineItem || !paragraphText?.ownerDocument) {
    throw new Error("the first page has no paragraph of text")
  }

  const collapsedRange = paragraphText.ownerDocument.createRange()

  collapsedRange.setStart(paragraphText, 2)
  collapsedRange.collapse(true)

  return {
    id,
    cfi: reader.cfi.generateCfiFromRange(collapsedRange, spineItem.item),
    itemIndex: 0,
  }
}

describe("a row of the Annotations dialog", () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let reader: TextDocumentReader | undefined

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    reader?.destroy()
    document.body.replaceChildren()
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
  })

  it("shows the page of a highlight with no text, stored or located, and not the text of the node where its range starts", async () => {
    const mountedReader = await mountTextDocumentReader()
    reader = mountedReader
    const highlights = [
      {
        ...createHighlightWithNoText(mountedReader, "stored"),
        highlightedText: "",
      },
      createHighlightWithNoText(mountedReader, "located"),
    ]

    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>
          <ReaderContextProvider annotations={[]}>
            <ReaderInContext reader={mountedReader} />
            <AnnotationsList
              annotations={highlights}
              onNavigate={function navigateNowhere() {}}
            />
          </ReaderContextProvider>
        </ChakraProvider>,
      )
    })

    /**
     * The rows locate the same cfis, and a cfi is located once for all its
     * subscribers: once these have a page, so do the rows.
     */
    await act(() =>
      firstValueFrom(
        mountedReader
          .locateResource(highlights)
          .pipe(
            filter((locatedHighlights) =>
              locatedHighlights.every(
                ({ meta }) => meta.absolutePageIndex !== undefined,
              ),
            ),
          ),
      ),
    )

    expect(
      [...container.querySelectorAll("li")].map((row) => row.textContent),
    ).toEqual(["Page 1Book page: 1", "Page 1Book page: 1"])
  })
})

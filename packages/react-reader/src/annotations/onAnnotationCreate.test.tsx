/* @vitest-environment jsdom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import {
  createReader,
  DocumentRenderer,
  type Manifest,
} from "@prose-reader/core"
import {
  type Annotation,
  annotationsEnhancer,
} from "@prose-reader/enhancer-annotations"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { EMPTY, of } from "rxjs"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { ReaderContextProvider } from "../context/ReaderContextProvider.tsx"
import { ReaderInContext } from "../tests/ReaderInContext.tsx"
import { AnnotateControls } from "./AnnotateControls.tsx"
import { AnnotationDrawer } from "./AnnotationDrawer.tsx"
import { useBookmarkOnCornerTap } from "./bookmarks/useBookmarkOnCornerTap.ts"

/**
 * An app stores what `onAnnotationCreate` reports, in a database or through a
 * message, which copy a value with the structured clone algorithm. A browser
 * cannot clone an event or a selection. react-reader reports an `Annotation`:
 * the id and the cfi the reader gives it, and the color and the notes of a
 * highlight.
 *
 * The tests compare the keys of what is reported, not whether it clones:
 * jsdom clones its events like plain objects.
 */

/** jsdom has no layout, so every element reports this size. */
const viewport = { width: 400, height: 600 }

/**
 * Renders each item as a text document in a frame, the way the html renderer
 * does, so that its text can be selected. Its body holds one paragraph.
 */
class TextDocumentRenderer extends DocumentRenderer {
  onCreateDocument() {
    return of(this.context.document.createElement("iframe"))
  }

  onLoadDocument() {
    this.attach()

    const frameDocument = this.getDocumentFrame()?.contentDocument

    if (!frameDocument) throw new Error("the frame has no document")

    frameDocument.body.innerHTML = `<p>A paragraph of text.</p>`

    return EMPTY
  }

  onUnload() {}

  onLayout() {
    return of(undefined)
  }

  onRenderHeadless() {
    return EMPTY
  }

  getDocumentFrame() {
    const frame = this.documentContainer

    return frame instanceof HTMLIFrameElement ? frame : undefined
  }
}

/**
 * Two single pages, each a candidate for a bookmark once laid out, since a
 * pre-paginated page always is.
 */
const manifest: Manifest = {
  filename: "test",
  mediaType: "application/vnd.comicbook+zip",
  title: "test",
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "none",
  items: [],
  spineItems: [0, 1].map((index) => ({
    href: `/page_${index}.xhtml`,
    containerUri: `page_${index}.xhtml`,
    id: `${index}`,
    index,
    mediaType: "application/xhtml+xml",
    progressionWeight: 0.5,
    renditionLayout: "pre-paginated",
  })),
}

/** jsdom has neither observer, and nothing here depends on what they report. */
class InertObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", InertObserver)
  vi.stubGlobal("IntersectionObserver", InertObserver)
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => viewport.width,
  })
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => viewport.height,
  })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, viewport.width, viewport.height),
  )
})

const createAppReader = gesturesEnhancer(annotationsEnhancer(createReader))

type AppReader = ReturnType<typeof createAppReader>

function BookmarkOnCornerTap() {
  useBookmarkOnCornerTap()

  return null
}

/**
 * Waits for `assertion` to pass inside `act`: the reader emits on its own
 * timers, and what the components render from it must be flushed.
 */
const waitForInAct = <Result,>(assertion: () => Result) =>
  act(() => vi.waitFor(assertion))

describe("onAnnotationCreate", () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let reader: AppReader

  /**
   * A mounted reader, with what react-reader renders to create an annotation:
   * the Annotate button of a selection, the drawer it opens, and the bookmark
   * of a tap in the top right corner of a page.
   */
  const renderAnnotationCreation = async () => {
    const onAnnotationCreate = vi.fn<(annotation: Annotation) => void>()

    reader = createAppReader({
      manifest,
      getRenderer: () => (props) => new TextDocumentRenderer(props),
      getResource: () => of(new Response("", { status: 200 })),
    })

    const readerElement = document.createElement("div")
    document.body.appendChild(readerElement)
    reader.mount(readerElement)

    await vi.waitFor(() =>
      expect(reader.spineItemsManager.get(0)?.value.isReady).toBe(true),
    )

    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>
          <ReaderContextProvider
            annotations={[]}
            onAnnotationCreate={onAnnotationCreate}
          >
            <ReaderInContext reader={reader} />
            <AnnotateControls />
            <AnnotationDrawer />
            <BookmarkOnCornerTap />
          </ReaderContextProvider>
        </ChakraProvider>,
      )
    })

    return { onAnnotationCreate }
  }

  /**
   * Selects text in the first item's document, then releases the pointer, as
   * a user does. The reader then holds the selection with the event that
   * ended it, which is what the Annotate button reads.
   */
  const selectTextAndRelease = async () => {
    const frameDocument = reader.spineItemsManager
      .get(0)
      ?.renderer.getDocumentFrame()?.contentDocument
    const frameWindow = frameDocument?.defaultView
    const text = frameDocument?.querySelector("p")?.firstChild

    if (!frameDocument || !frameWindow || !text) {
      throw new Error("the first item has no text to select")
    }

    await act(async () => {
      frameDocument.getSelection()?.setBaseAndExtent(text, 2, text, 11)
    })
    await waitForInAct(() =>
      expect(reader.selection.getSelection()?.type).toBe("change"),
    )

    await act(async () => {
      frameDocument.dispatchEvent(new frameWindow.PointerEvent("pointerdown"))
      frameDocument.dispatchEvent(new frameWindow.PointerEvent("pointerup"))
    })
    await waitForInAct(() =>
      expect(reader.selection.getSelection()?.type).toBe("over"),
    )
  }

  const clickButton = async (label: string) => {
    const button = await waitForInAct(() => {
      const found = [...document.querySelectorAll("button")].find(
        (element) => element.textContent === label,
      )

      if (!found) throw new Error(`no button "${label}"`)

      return found
    })

    await act(async () => {
      button.click()
    })
  }

  /** Taps the top right corner of the first page, with the mouse. */
  const tapTopRightCorner = async () => {
    const target = reader.context.value.rootElement

    if (!target) throw new Error("the reader is not mounted")

    for (const type of ["pointerdown", "pointerup"] as const) {
      await act(async () => {
        target.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 1,
            isPrimary: true,
            pointerType: "mouse",
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            clientX: viewport.width - 1,
            clientY: 1,
            bubbles: true,
            cancelable: true,
          }),
        )
      })
    }
  }

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
    reader.destroy()
    document.body.replaceChildren()
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
  })

  it("reports a highlight made from the drawer with its id, cfi, color and notes, and nothing of the selection", async () => {
    const { onAnnotationCreate } = await renderAnnotationCreation()

    await selectTextAndRelease()
    await clickButton("Annotate")
    await clickButton("Highlight")

    await waitForInAct(() =>
      expect(onAnnotationCreate).toHaveBeenCalledTimes(1),
    )
    expect(onAnnotationCreate.mock.calls[0]?.[0]).toStrictEqual({
      id: expect.any(String),
      cfi: expect.any(String),
      highlightColor: "rgba(216, 191, 216, 1)",
      notes: "",
    })
  })

  it("reports a bookmark made by a tap in the corner of a page with its id and cfi, and not the page index", async () => {
    const { onAnnotationCreate } = await renderAnnotationCreation()

    await tapTopRightCorner()

    await waitForInAct(() =>
      expect(onAnnotationCreate).toHaveBeenCalledTimes(1),
    )
    expect(onAnnotationCreate.mock.calls[0]?.[0]).toStrictEqual({
      id: expect.any(String),
      cfi: expect.any(String),
    })
  })
})

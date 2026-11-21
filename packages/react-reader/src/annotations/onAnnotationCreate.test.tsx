/* @vitest-environment jsdom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import type { NewAnnotation } from "@prose-reader/enhancer-annotations"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ReaderContextProvider } from "../context/ReaderContextProvider.tsx"
import { ReaderInContext } from "../tests/ReaderInContext.tsx"
import {
  installJsdomLayout,
  mountTextDocumentReader,
  type TextDocumentReader,
  viewport,
} from "../tests/textDocumentReader.ts"
import { AnnotateControls } from "./AnnotateControls.tsx"
import { AnnotationDrawer } from "./AnnotationDrawer.tsx"
import type { BookmarkIdByItemPage } from "./bookmarks/useBookmarkIdByItemPage.ts"
import { useBookmarkOnCornerTap } from "./bookmarks/useBookmarkOnCornerTap.ts"

installJsdomLayout()

/** No page has a bookmark yet. */
const noBookmarks: BookmarkIdByItemPage = new Map()

function BookmarkOnCornerTap() {
  useBookmarkOnCornerTap(noBookmarks)

  return null
}

/**
 * Waits for `assertion` to pass inside `act`: the reader emits on its own
 * timers, and what the components render from it must be flushed.
 */
const waitForInAct = <Result,>(assertion: () => Result) =>
  act(() => vi.waitFor(assertion))

/**
 * An app stores what `onAnnotationCreate` reports, in IndexedDB or through
 * `postMessage`, which copy a value with the structured clone algorithm. A
 * browser cannot clone an event or a selection. The app gives the annotation
 * its id.
 *
 * The tests compare the keys of what is reported, not whether it clones:
 * jsdom clones its events like plain objects.
 */
describe("onAnnotationCreate", () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let reader: TextDocumentReader

  /**
   * A mounted reader, with what react-reader renders to create an annotation:
   * the Annotate button of a selection, the drawer it opens, and the bookmark
   * of a tap in the top right corner of a page.
   */
  const renderAnnotationCreation = async () => {
    const onAnnotationCreate = vi.fn<(annotation: NewAnnotation) => void>()

    reader = await mountTextDocumentReader()

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

  /** Types `notes` in the Annotation field of the drawer, as a user does. */
  const typeNotes = async (notes: string) => {
    const field = await waitForInAct(() => {
      const found = document.querySelector("textarea")

      if (!found) throw new Error("the drawer has no Annotation field")

      return found
    })
    // React reads the value through the setter of the prototype, not the
    // one of the element, which it overrides to track changes.
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set

    await act(async () => {
      setValue?.call(field, notes)
      field.dispatchEvent(new Event("input", { bubbles: true }))
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

  it("reports a highlight made from the drawer with the range of the selection, the selected text, its color and notes, and neither an id nor anything of the selection", async () => {
    const { onAnnotationCreate } = await renderAnnotationCreation()

    await selectTextAndRelease()
    await clickButton("Annotate")
    await typeNotes("A note")
    await clickButton("Highlight")

    await waitForInAct(() =>
      expect(onAnnotationCreate).toHaveBeenCalledTimes(1),
    )
    const reported = onAnnotationCreate.mock.calls[0]?.[0]
    expect(reported).toStrictEqual({
      cfi: expect.any(String),
      highlightedText: "paragraph",
      highlightColor: "rgba(216, 191, 216, 1)",
      notes: "A note",
    })
    expect(reader.cfi.parseCfi(reported?.cfi ?? "")).toMatchObject({
      itemIndex: 0,
      isCfiRange: true,
    })
  })

  it("reports a bookmark made by a tap in the corner of a page with its cfi, and neither an id nor the page index", async () => {
    const { onAnnotationCreate } = await renderAnnotationCreation()

    await tapTopRightCorner()

    await waitForInAct(() =>
      expect(onAnnotationCreate).toHaveBeenCalledTimes(1),
    )
    expect(onAnnotationCreate.mock.calls[0]?.[0]).toStrictEqual({
      cfi: expect.any(String),
    })
  })
})

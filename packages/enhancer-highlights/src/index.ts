import { Observable, Subject } from "rxjs"
import { Reader, Report } from "@prose-reader/core"
import { takeUntil, tap } from "rxjs/operators"

type Highlight = {
  anchorCfi: string
  focusCfi: string
  id: string
  text?: string
  spineItemIndex?: number | undefined
  anchorNode?: Node
  anchorOffset?: number
  focusNode?: Node
  focusOffset?: number
  element?: HTMLElement
}

type SubjectType = { type: `onHighlightClick`; data: Highlight } | { type: `onUpdate`; data: Highlight[] }

const SHOULD_NOT_LAYOUT = false
const HIGHLIGHT_ID_PREFIX = `prose-reader-enhancer-highlights`

/**
 * @todo
 * Optimize refresh of elements
 */
export const highlightsEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions
  ): InheritOutput & {
    highlights: {
      add: (highlight: Highlight) => void
      has: (highlight: Highlight) => boolean
      remove: (id: string) => void
      isHighlightClicked: (event: MouseEvent | TouchEvent | PointerEvent) => boolean
      $: Observable<SubjectType>
    }
  } => {
    const reader = next(options)
    const highlights$ = new Subject<SubjectType>()
    let highlights: Highlight[] = []

    const getRangeForHighlight = (
      overlayElement: HTMLElement,
      anchor: { node: Node; offset?: number },
      focus: { node: Node; offset?: number }
    ) => {
      const range = overlayElement.ownerDocument.createRange()
      try {
        range.setStart(anchor.node, anchor.offset || 0)
        range.setEnd(focus.node, focus.offset || 0)
      } catch (e) {
        Report.error(e)
      }

      return range
    }

    const drawHighlight = (overlayElement: HTMLElement, highlight: Highlight) => {
      const { node: anchorNode, offset: anchorOffset } = reader.resolveCfi(highlight.anchorCfi) || {}
      const { node: focusNode, offset: focusOffset } = reader.resolveCfi(highlight.focusCfi) || {}

      if (anchorNode && focusNode) {
        // remove old previous highlight
        highlight.element?.remove()

        const range = getRangeForHighlight(
          overlayElement,
          { node: anchorNode, offset: anchorOffset },
          { node: focusNode, offset: focusOffset }
        )

        highlight.text = range.toString()

        const rectElements = Array.from(range.getClientRects()).map((domRect) => {
          const rectElt = overlayElement.ownerDocument.createElement(`div`)
          rectElt.style.cssText = `
            position: absolute;
            width: ${domRect.width}px;
            height: ${domRect.height}px;
            top: ${domRect.top}px;
            left: ${domRect.left}px;
            background-color: green;
            opacity: 50%;
          `
          rectElt.setAttribute(`data-${HIGHLIGHT_ID_PREFIX}`, ``)

          return rectElt
        })

        const containerElement = overlayElement.ownerDocument.createElement(`div`)
        containerElement.style.cssText = `
          pointer-events: auto;
        `

        highlight.element = containerElement

        rectElements.forEach((el) => containerElement.appendChild(el))
        overlayElement.appendChild(containerElement)

        containerElement.addEventListener(`click`, () => {
          highlights$.next({ type: `onHighlightClick`, data: highlight })
        })
      }
    }

    const drawHighlightsForItem = (overlayElement: HTMLElement, itemIndex: number) => {
      highlights.forEach((highlight) => {
        if (highlight.spineItemIndex === itemIndex) {
          drawHighlight(overlayElement, highlight)
        }
      })
    }

    const enrichHighlight = (highlight: Highlight) => {
      const cfiMetaInfo = reader.getCfiMetaInformation(highlight.anchorCfi)

      return {
        ...highlight,
        spineItemIndex: cfiMetaInfo?.spineItemIndex,
      }
    }

    const _add = (highlight: Highlight) => {
      const newHighlight = enrichHighlight(highlight)

      highlights.push(newHighlight)

      if (newHighlight.spineItemIndex !== undefined) {
        reader.manipulateSpineItems(({ index, overlayElement }) => {
          if (index !== newHighlight.spineItemIndex) return SHOULD_NOT_LAYOUT

          drawHighlight(overlayElement, newHighlight)

          return SHOULD_NOT_LAYOUT
        })
      }

      return highlight
    }

    const add = (highlight: Highlight | Highlight[]) => {
      ;(!Array.isArray(highlight) ? [highlight] : highlight).forEach(_add)

      highlights$.next({ type: `onUpdate`, data: highlights })
    }

    const remove = (id: string) => {
      highlights = highlights.filter((highlight) => {
        if (highlight.id === id) {
          highlight.element?.remove()
        }

        return highlight.id !== id
      })

      highlights$.next({ type: `onUpdate`, data: highlights })
    }

    const has = (highlight: Highlight) => !!highlights.find(({ id }) => id === highlight.id)

    const isHighlightClicked = (event: MouseEvent | TouchEvent | PointerEvent) => {
      if (event.target instanceof HTMLElement) {
        return event.target.hasAttribute(`data-${HIGHLIGHT_ID_PREFIX}`)
      }

      return false
    }

    /**
     * If the user has registered highlights before the reader was ready we want to
     * init them and draw them
     */
    reader.$.ready$
      .pipe(
        tap(() => {
          highlights = highlights.map((highlight) => {
            if (!highlight.spineItemIndex) return enrichHighlight(highlight)

            return highlight
          })

          highlights$.next({ type: `onUpdate`, data: highlights })

          reader.manipulateSpineItems(({ overlayElement, index }) => {
            drawHighlightsForItem(overlayElement, index)

            return SHOULD_NOT_LAYOUT
          })
        }),
        takeUntil(reader.$.destroy$)
      )
      .subscribe()

    const refreshHighlightsOnLayout$ = reader.$.layout$.pipe(
      tap(() => {
        reader.manipulateSpineItems(({ overlayElement, index }) => {
          drawHighlightsForItem(overlayElement, index)

          return SHOULD_NOT_LAYOUT
        })
      })
    )

    refreshHighlightsOnLayout$.pipe(takeUntil(reader.$.destroy$)).subscribe()

    return {
      ...reader,
      highlights: {
        add,
        remove,
        has,
        isHighlightClicked,
        $: highlights$.asObservable(),
      },
    }
  }

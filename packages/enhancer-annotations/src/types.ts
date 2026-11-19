import type { Observable } from "rxjs"
import type { ReaderHighlights } from "./annotations/ReaderHighlights.ts"
import type { RuntimeAnnotation } from "./annotations/types.ts"

export interface Annotation {
  id: string
  cfi: string
  highlightColor?: string
  notes?: string
  selected?: boolean
}

/**
 * Text a user selected in a spine item, as `reader.selection.getSelection()`
 * gives it.
 */
export type AnnotateSelectionParams = {
  itemIndex: number
  selection: Selection
}

/** A page, by its absolute index, as for a bookmark. */
export type AnnotateAbsolutePageParams = {
  absolutePageIndex: number
}

export type AnnotationsEnhancerOptions = {
  annotations$?: Observable<Annotation[]>
}

export type AnnotationsEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_ANNOTATIONS: boolean
  annotations: {
    update: (settings: Partial<AnnotationsEnhancerOptions>) => void
    annotations$: Observable<RuntimeAnnotation[]>
    highlightTap$: ReaderHighlights["tap$"]
    candidates$: Observable<boolean[]>
    /**
     * Gives a new annotation of a selection, or of a page, its `id` and its
     * `cfi`: two strings and nothing else, so that the result can be stored
     * as it is. Add the other fields of your annotation to it, such as
     * `highlightColor` or `notes`.
     *
     * - For a selection, the `cfi` is the range of the selection.
     * - For a page, the `cfi` points to the first visible node of the page,
     *   or to the root of its spine item when the page has none.
     *
     * It returns `undefined` when the reader has no such spine item or page,
     * or when the selection holds no range.
     */
    createAnnotation: (
      params: AnnotateSelectionParams | AnnotateAbsolutePageParams,
    ) => Pick<Annotation, "id" | "cfi"> | undefined
    isTargetWithinHighlight: (target: EventTarget) => boolean
  }
}

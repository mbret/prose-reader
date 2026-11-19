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
 * gives it. `selection` must be in the document of the spine item at
 * `itemIndex`.
 */
export type AnnotateSelectionParams = {
  itemIndex: number
  selection: Selection
  absolutePageIndex?: never
}

/** Where an annotation is: its spine item, and its page in that item. */
export type AnnotationPage = {
  itemIndex: number
  pageIndex: number
}

/** A page, by its absolute index, as for a bookmark. */
export type AnnotateAbsolutePageParams = {
  absolutePageIndex: number
  itemIndex?: never
  selection?: never
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
     * The page of each annotation whose spine item has its document loaded,
     * by annotation id. It is found on the item's document as it is laid out,
     * and found again after each of its layouts, so it holds no annotation of
     * an item that is not loaded. A range is on the page where it starts.
     *
     * - A pre-paginated item has one page: its annotations are on page 0.
     * - An annotation whose cfi names only its item is on the item's first
     *   page.
     * - Any other annotation is on the page of the node its cfi points to,
     *   once its item is laid out. One whose cfi does not resolve in its
     *   item has no page.
     *
     * It emits once the annotations are known, then each time the list or
     * the page of one of them changes.
     */
    pageByAnnotationId$: Observable<ReadonlyMap<string, AnnotationPage>>
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

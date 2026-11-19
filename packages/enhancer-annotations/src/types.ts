import type { PageEntry } from "@prose-reader/core"
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
    /**
     * Emits `{ event, annotation }` when the user taps a highlight. Where
     * highlights overlap, it reports the one drawn on top. Completes when the
     * reader is destroyed.
     */
    highlightTap$: ReaderHighlights["tap$"]
    candidates$: Observable<boolean[]>
    /**
     * The page of each annotation whose page is known, by annotation id: its
     * spine item and its page in that item, as
     * `reader.cfi.getSpineItemPageIndexFromCfi()` gives it. A range is on the
     * page where it starts. When the list holds an id more than once, its
     * last entry wins.
     *
     * An annotation of a pre-paginated item, or whose cfi names only its
     * item, has its page at once. Any other has one while its chapter is
     * loaded and laid out, so the map follows the chapters around the reading
     * position.
     *
     * The pages are found again when the list changes, when a layout pass
     * completes, and when a chapter becomes ready or unloads. A chapter that
     * is being laid out at that time gives its annotations no page. A change
     * of an annotation's selection, color or note finds no page again.
     *
     * It emits once the annotations are known, then only when a page in it
     * changes. It completes when the reader is destroyed.
     */
    pageByAnnotationId$: Observable<
      ReadonlyMap<string, Pick<PageEntry, "itemIndex" | "pageIndex">>
    >
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

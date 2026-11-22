import type { Observable } from "rxjs"
import type { ReaderHighlights } from "./annotations/ReaderHighlights.ts"
import type { RuntimeAnnotation } from "./annotations/types.ts"

/**
 * The annotations of each page, by spine item index, then by page index in
 * the item, in the order of the list.
 */
export type AnnotationsByItemPage = ReadonlyMap<
  number,
  ReadonlyMap<number, readonly RuntimeAnnotation[]>
>

export interface Annotation {
  id: string
  cfi: string
  /**
   * The text of the range that `cfi` points to, as `Range.toString()` gives
   * it: the text nodes of the document joined, with their whitespace as the
   * document holds it and nothing added between two paragraphs. It does not
   * depend on CSS, the layout or the browser. `createAnnotation` gives it for
   * a selection. An annotation of a page has none.
   */
  highlightedText?: string
  highlightColor?: string
  notes?: string
  selected?: boolean
}

/**
 * An annotation that the app has not stored yet: it has no `id`. The app
 * gives it one of its own when it stores it, so it chooses the form of its
 * ids. Each id must be unique among the annotations given to the reader.
 */
export type NewAnnotation = Omit<Annotation, "id">

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
     * The annotations whose page is known, by spine item and page: what a
     * page-level interface reads, such as a mark on each annotated page. A
     * range is on the page where it starts. It locates the annotations with
     * `reader.locateResource()` in its shallow mode, so it loads nothing and
     * follows its rules: an annotation of a pre-paginated item, or at the
     * root of its item, has its page at once. Any other has one once its
     * chapter is loaded and laid out and its cfi resolves in it, and none
     * once the chapter unloads. While a layout of the chapter is pending, it
     * keeps its page, and one added in that time has none until the
     * layout's pages are published.
     *
     * It emits once the annotations are located, then each time an
     * annotation of a page moves to another page, comes, goes or changes. It
     * completes when the reader is destroyed.
     */
    annotationsByItemPage$: Observable<AnnotationsByItemPage>
    /**
     * Gives a new annotation of a selection, or of a page, its `cfi` and, for
     * a selection, its `highlightedText`: strings and nothing else, so that
     * the result can be stored as it is. Add an `id` of your own and the
     * other fields of your annotation to it, such as `highlightColor` or
     * `notes`.
     *
     * - For a selection, the `cfi` is the range of the selection, and
     *   `highlightedText` is the text of that range.
     * - For a page, the `cfi` points to the first visible node of the page,
     *   or to the root of its spine item when the page has none. The result
     *   has no `highlightedText`.
     *
     * It returns `undefined` when the reader has no such spine item or page,
     * or when the selection holds no range.
     */
    createAnnotation: (
      params: AnnotateSelectionParams | AnnotateAbsolutePageParams,
    ) => Pick<NewAnnotation, "cfi" | "highlightedText"> | undefined
    isTargetWithinHighlight: (target: EventTarget) => boolean
  }
}

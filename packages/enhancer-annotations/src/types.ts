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

type AnnotationSharedParams = {
  selection?: Selection
}

export type AnnotateParams = AnnotationSharedParams & {
  itemIndex: number
}

export type AnnotateAbsolutePageParams = AnnotationSharedParams & {
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
     * Creates the annotation of a selection, or of a page: a new `id`, and
     * the `cfi` of the selected range, or of the page. It returns these two
     * fields only, whatever else `params` holds, so that the result can be
     * stored as it is. Add the other fields of your annotation to it, such as
     * `highlightColor` or `notes`. It returns `undefined` when the reader has
     * no such spine item.
     */
    createAnnotation: (
      params: AnnotateParams | AnnotateAbsolutePageParams,
    ) => Pick<Annotation, "id" | "cfi"> | undefined
    isTargetWithinHighlight: (target: EventTarget) => boolean
  }
}

import type { Observable } from "rxjs"
import type { ReaderHighlights } from "./annotations/ReaderHighlights"
import type { RuntimeAnnotation } from "./annotations/types"

export interface Annotation {
  id: string
  cfi: string
  highlightColor?: string
  notes?: string
  selected?: boolean
}

type AnnotationSharedParams = Omit<Annotation, "id" | "cfi"> & {
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
    createAnnotation: (
      params: AnnotateParams | AnnotateAbsolutePageParams,
    ) => Annotation | undefined
    isTargetWithinHighlight: (target: EventTarget) => boolean
  }
}

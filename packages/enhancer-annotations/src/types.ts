import type { Observable } from "rxjs"
import type { Commands } from "./Commands"
import type { ReaderHighlights } from "./annotations/ReaderHighlights"
import type { RuntimeAnnotation } from "./annotations/types"

export interface Annotation {
  id: string
  cfi: string
  highlightColor?: string
  notes?: string
}

export type AnnotationsEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_ANNOTATIONS: boolean
  annotations: {
    annotations$: Observable<RuntimeAnnotation[]>
    highlightTap$: ReaderHighlights["tap$"]
    candidates$: Observable<boolean[]>
    annotate: Commands["annotate"]
    annotateAbsolutePage: Commands["annotateAbsolutePage"]
    add: Commands["add"]
    delete: Commands["delete"]
    update: Commands["update"]
    select: Commands["select"]
    reset: Commands["reset"]
    isTargetWithinHighlight: (target: EventTarget) => boolean
  }
}

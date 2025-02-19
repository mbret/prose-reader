import type { Observable } from "rxjs"
import type { Commands } from "./Commands"
import type { ProseHighlight } from "./highlights/Highlight"
import type { ReaderHighlights } from "./highlights/ReaderHighlights"

export type SerializableHighlight = {
  cfi: string
  endCfi: string | undefined
  color?: string
  contents?: string[]
  /**
   * Not required, only used for display purposes
   */
  selectionAsText?: string
  /**
   * Unique local ID. This is to ensure unicity
   * for duplicate selections
   */
  id: string
}

export type AnnotationsEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_ANNOTATIONS: boolean
  annotations: {
    highlights$: Observable<ProseHighlight[]>
    highlightTap$: ReaderHighlights["tap$"]
    highlight: Commands["highlight"]
    add: Commands["add"]
    delete: Commands["delete"]
    update: Commands["update"]
    select: Commands["select"]
    isTargetWithinHighlight: (target: EventTarget) => boolean
  }
}

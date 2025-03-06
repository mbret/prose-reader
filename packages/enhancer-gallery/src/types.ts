import type { SpineItem } from "@prose-reader/core"
import type { Observable } from "rxjs"

export type GalleryEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_GALLERY: boolean
  gallery: {
    snapshot: (
      spineItem: SpineItem,
      parent: Element,
      options: {
        height: number
        width: number
      },
    ) => Observable<HTMLElement>
  }
}

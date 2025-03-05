import type { Observable } from "rxjs"

export type GalleryEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_GALLERY: boolean
  gallery: {
    create: (options?: {
      columns?: number
      gridItemClassName?: string
    }) => Observable<HTMLElement>
  }
}

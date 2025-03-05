import type { Reader } from "@prose-reader/core"
import { Gallery } from "./Gallery"
import type { GalleryEnhancerAPI } from "./types"

export type { GalleryEnhancerAPI }

export const galleryEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & GalleryEnhancerAPI => {
    const reader = next(options)

    return {
      ...reader,
      __PROSE_READER_ENHANCER_GALLERY: true,
      gallery: {
        create: (options) => new Gallery(reader, options),
      },
    }
  }

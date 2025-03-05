import type { Reader } from "@prose-reader/core"
import { Snapshot } from "./Snapshot"
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
        snapshot: (spineItem, options) =>
          new Snapshot(reader, spineItem, options),
      },
    }
  }

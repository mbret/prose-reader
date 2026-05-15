import { injectCSS, type Reader } from "@prose-reader/core"
import { Snapshot } from "./Snapshot"
import styles from "./style.css?inline"
import type { GalleryEnhancerAPI } from "./types"

export type { GalleryEnhancerAPI }

const STYLE_ID = "prose-reader-enhancer-gallery-snapshot-styles"

export const galleryEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & GalleryEnhancerAPI => {
    const reader = next(options)

    if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
      injectCSS(document, STYLE_ID, styles)
    }

    return {
      ...reader,
      __PROSE_READER_ENHANCER_GALLERY: true,
      gallery: {
        snapshot: (spineItem, parent, options) =>
          new Snapshot(reader, spineItem, parent, options),
      },
    }
  }

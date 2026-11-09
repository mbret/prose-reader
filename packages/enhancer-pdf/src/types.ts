/// <reference types="vite/client" />

import type { Archive } from "@prose-reader/archive-reader"
import type { Manifest } from "@prose-reader/core"
import type { Observable } from "rxjs"

export type EnhancerOptions = {
  pdf: {
    /**
     * Emits the pdf archive, from `createArchiveFromPdf`, that a spine item
     * whose container path ends in `.pdf` shows a page of. The archive must
     * stay open until the reader is destroyed. The enhancer subscribes when
     * it first reads a page of the item and unsubscribes when the reader is
     * destroyed, so an archive from `Streamer.accessArchive` stays open
     * exactly that long.
     */
    getArchiveForItem: (
      item: Manifest["spineItems"][number],
    ) => Observable<Archive>
    pdfjsViewerInlineCss: string
  }
}

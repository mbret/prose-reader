/// <reference types="vite/client" />

import type { Archive } from "@prose-reader/archive-reader"
import type { Manifest } from "@prose-reader/core"
import type { Observable } from "rxjs"

export type EnhancerOptions = {
  pdf: {
    /**
     * The pdf archive, from `createArchiveFromPdf`, that a spine item whose
     * container path ends in `.pdf` shows a page of. The enhancer subscribes
     * when it first renders a page of the item and stays subscribed until the
     * reader is destroyed: the archive must stay open while the subscription
     * lives, as one from `Streamer.accessArchive` does. When it emits more
     * than once, the page is read from the latest archive.
     */
    getArchiveForItem: (
      item: Manifest["spineItems"][number],
    ) => Observable<Archive>
    pdfjsViewerInlineCss: string
  }
}

/// <reference types="vite/client" />

import type { Manifest } from "@prose-reader/core"
import type { Archive } from "@prose-reader/streamer"
import type { Observable } from "rxjs"

export type EnhancerOptions = {
  pdf: {
    getArchiveForItem: (
      item: Manifest["items"][number],
    ) => Observable<Archive | undefined>
    pdfjsViewerInlineCss: string
  }
}

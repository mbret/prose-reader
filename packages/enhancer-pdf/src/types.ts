/// <reference types="vite/client" />

import { Manifest } from "@prose-reader/core"
import { Archive } from "@prose-reader/streamer"
import { Observable } from "rxjs"

export type EnhancerOptions = {
  pdf: {
    getArchiveForItem: (
      item: Manifest["items"][number],
    ) => Observable<Archive | undefined>
    pdfjsViewerInlineCss: string
  }
}

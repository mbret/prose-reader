/// <reference types="vite/client" />

import type { Archive } from "@prose-reader/archive-reader"
import type { Manifest } from "@prose-reader/core"
import type { Observable } from "rxjs"

export type EnhancerOptions = {
  pdf: {
    getArchiveForItem: (
      item: Manifest["items"][number],
    ) => Observable<Archive | undefined>
    pdfjsViewerInlineCss: string
  }
}

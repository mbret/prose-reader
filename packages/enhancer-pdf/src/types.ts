import { Manifest } from "@prose-reader/core"
import { Archive } from "@prose-reader/streamer"
import { Observable } from "rxjs"

export type EnhancerOptions = {
  pdf: {
    getArchiveForItem: (item: Manifest["spineItems"][number]) => Observable<Archive | undefined>
  }
}

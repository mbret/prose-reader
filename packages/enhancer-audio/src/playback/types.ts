import type {
  PaginationInfo,
  Reader,
  ResourceHandler,
} from "@prose-reader/core"
import type { Manifest } from "@prose-reader/shared"
import type { Observable } from "rxjs"

export type AudioControllerReader = {
  context: {
    manifest$: Observable<Manifest>
  }
  pagination: {
    state$: Observable<PaginationInfo>
  }
  navigation: Pick<
    Reader["navigation"],
    "navigate" | "goToRightOrBottomSpineItem"
  >
  spineItemsManager: {
    get: (
      index: number,
    ) => { resourcesHandler: Pick<ResourceHandler, "getResource"> } | undefined
  }
}

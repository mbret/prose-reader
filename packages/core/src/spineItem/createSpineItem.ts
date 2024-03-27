import { BehaviorSubject, Observable } from "rxjs"
import { Context } from "../context/context"
import { Manifest } from "../types"
import { Hook } from "../types/Hook"
import { createPrePaginatedSpineItem } from "./prePaginatedSpineItem"
import { createReflowableSpineItem } from "./reflowableSpineItem"
import { Settings } from "../settings/settings"

export const createSpineItem = ({
  item,
  context,
  containerElement,
  iframeEventBridgeElement$,
  hooks$,
  viewportState$,
  settings
}: {
  item: Manifest[`spineItems`][number]
  containerElement: HTMLElement
  iframeEventBridgeElement$: BehaviorSubject<HTMLElement | undefined>
  context: Context
  hooks$: BehaviorSubject<Hook[]>
  viewportState$: Observable<`free` | `busy`>
  settings: Settings
}) => {
  if (item.renditionLayout === `pre-paginated`) {
    return createPrePaginatedSpineItem({
      item,
      context,
      containerElement,
      iframeEventBridgeElement$,
      hooks$,
      viewportState$,
      settings
    })
  }

  return createReflowableSpineItem({
    item,
    context,
    containerElement,
    iframeEventBridgeElement$,
    hooks$,
    viewportState$,
    settings
  })
}

export type SpineItem = ReturnType<typeof createSpineItem>

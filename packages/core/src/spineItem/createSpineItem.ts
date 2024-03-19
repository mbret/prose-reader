import { BehaviorSubject, Observable } from "rxjs"
import { Context } from "../context"
import { Manifest } from "../types"
import { Hook } from "../types/Hook"
import { createPrePaginatedSpineItem } from "./prePaginatedSpineItem"
import { createReflowableSpineItem } from "./reflowableSpineItem"

export const createSpineItem = ({
  item,
  context,
  containerElement,
  iframeEventBridgeElement$,
  hooks$,
  viewportState$,
}: {
  item: Manifest[`spineItems`][number]
  containerElement: HTMLElement
  iframeEventBridgeElement$: BehaviorSubject<HTMLElement | undefined>
  context: Context
  hooks$: BehaviorSubject<Hook[]>
  viewportState$: Observable<`free` | `busy`>
}) => {
  if (item.renditionLayout === `pre-paginated`) {
    return createPrePaginatedSpineItem({
      item,
      context,
      containerElement,
      iframeEventBridgeElement$,
      hooks$,
      viewportState$,
    })
  }

  return createReflowableSpineItem({
    item,
    context,
    containerElement,
    iframeEventBridgeElement$,
    hooks$,
    viewportState$,
  })
}

export type SpineItem = ReturnType<typeof createSpineItem>

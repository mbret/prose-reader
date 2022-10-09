import { BehaviorSubject, Observable } from "rxjs"
import { Context } from "../context"
import { Manifest } from "../types"
import { Hook } from "../types/Hook"
import { createPrePaginatedSpineItem } from "./prePaginatedSpineItem"
import { createReflowableSpineItem } from "./reflowableSpineItem"

export type SpineItem = {
  item: Manifest[`spineItems`][number]
} & (ReturnType<typeof createPrePaginatedSpineItem> | ReturnType<typeof createReflowableSpineItem>)

export const createSpineItem = ({
  item,
  context,
  containerElement,
  iframeEventBridgeElement,
  hooks$,
  viewportState$
}: {
  item: Manifest[`spineItems`][number]
  containerElement: HTMLElement
  iframeEventBridgeElement: HTMLElement
  context: Context
  hooks$: BehaviorSubject<Hook[]>
  viewportState$: Observable<`free` | `busy`>
}) => {
  let spineItem: ReturnType<typeof createPrePaginatedSpineItem> | ReturnType<typeof createReflowableSpineItem>

  if (item.renditionLayout === `pre-paginated`) {
    spineItem = createPrePaginatedSpineItem({ item, context, containerElement, iframeEventBridgeElement, hooks$, viewportState$ })
  } else {
    spineItem = createReflowableSpineItem({ item, context, containerElement, iframeEventBridgeElement, hooks$, viewportState$ })
  }

  return {
    item,
    ...spineItem
  }
}

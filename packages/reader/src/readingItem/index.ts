import { BehaviorSubject } from "rxjs"
import { Context } from "../context"
import { Manifest } from "../types"
import { Hook } from "../types/Hook"
import { createPrePaginatedReadingItem } from "./prePaginatedReadingItem"
import { createReflowableReadingItem } from "./reflowableReadingItem"

export type ReadingItem = {
  item: Manifest[`readingOrder`][number],
} & (ReturnType<typeof createPrePaginatedReadingItem> | ReturnType<typeof createReflowableReadingItem>)

export const createReadingItem = ({ item, context, containerElement, iframeEventBridgeElement, hooks$ }: {
  item: Manifest[`readingOrder`][number],
  containerElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
  hooks$: BehaviorSubject<Hook[]>
 }) => {
  let readingItem: ReturnType<typeof createPrePaginatedReadingItem> | ReturnType<typeof createReflowableReadingItem>

  if (item.renditionLayout === `pre-paginated`) {
    readingItem = createPrePaginatedReadingItem({ item, context, containerElement, iframeEventBridgeElement, hooks$ })
  } else {
    readingItem = createReflowableReadingItem({ item, context, containerElement, iframeEventBridgeElement, hooks$ })
  }

  return {
    item,
    ...readingItem
  }
}

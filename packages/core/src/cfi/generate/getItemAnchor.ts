import { SpineItem } from "../../spineItem/createSpineItem"

export const getItemAnchor = (spineItem: SpineItem) =>
  `|[prose~anchor~${encodeURIComponent(spineItem.item.id)}]`

import { SpineItem } from "../../spineItem/SpineItem"

export const getItemAnchor = (spineItem: SpineItem) =>
  `|[prose~anchor~${encodeURIComponent(spineItem.item.id)}]`

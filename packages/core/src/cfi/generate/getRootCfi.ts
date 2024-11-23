import { SpineItem } from "../../spineItem/SpineItem"
import { getItemAnchor } from "./getItemAnchor"

/**
 * Very light cfi lookup. Use it when you need to anchor user to correct item
 * but do not want to have heavy dom lookup. This is useful as pre-cfi before the content
 * is loaded for example.
 */
export const getRootCfi = (spineItem: SpineItem) => {
  const itemAnchor = getItemAnchor(spineItem.item)

  return `epubcfi(/0${itemAnchor})`
}

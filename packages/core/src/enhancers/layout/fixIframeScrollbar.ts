import type { Reader } from "../../reader"

export const fixIframeScrollbar = (reader: Reader) => {
  /**
   * Sometimes when iframe is being loaded and resized during layout, a scrollbar
   * may appear on the iframe#document level. It will be "empty" but stay there and
   * catch scrolling events instead.
   *
   * It is possible to prevent it by setting overflow: hidden in the iframe#html
   * element but I feel like this could have side effects and therefore it's better
   * to just disable it the old way even if this is deprecated.
   */
  reader.hookManager.register(`item.onDocumentLoad`, ({ itemId }) => {
    const spineItem = reader.spineItemsManager.get(itemId)
    const element = spineItem?.renderer.getDocumentFrame()

    element?.setAttribute("scrolling", "no")
  })
}

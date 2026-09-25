import type { Reader } from "@prose-reader/core"

/**
 * A browser lets an image, a link or a text selection be dragged out of the
 * page: pressed and moved a few pixels, it starts a drag of its own and cancels
 * the pointer for it. The recognizers then never see the pointer move on or be
 * released, so the press neither taps nor pans. Firefox does it on every image,
 * which on a comic is every page.
 *
 * Inside the book the pointer belongs to the gestures, so those drags are
 * cancelled in each item's document, the one core forwards the pointer events
 * from.
 */
export const preventNativeDrag = (reader: Reader) => {
  const cancelDrag = (event: DragEvent) => {
    event.preventDefault()
  }

  const documentOf = (itemId: string) =>
    reader.spineItemsManager.get(itemId)?.renderer.getDocumentFrame()
      ?.contentDocument

  reader.hookManager.register(`item.onDocumentLoad`, async ({ itemId }) => {
    documentOf(itemId)?.addEventListener(`dragstart`, cancelDrag)
  })

  reader.hookManager.register(`item.onDocumentUnload`, ({ itemId }) => {
    documentOf(itemId)?.removeEventListener(`dragstart`, cancelDrag)
  })
}

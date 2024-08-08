import { Reader } from "../../reader"

export const fixReflowable = (reader: Reader) => {
  /**
   * Handle page spread for reflowable item that act as pre-paginated
   *
   * - we have a reflowable item
   * - we want page spread
   * - the item has viewport dimension
   * - normal reflowable should not have viewport and should spread correctly
   * - because it has viewport we will scale the item to one page size (pre-paginated)
   *
   * @problem
   * If no blank page are demanded by the spine manager, the frame will be displayed
   * in the middle because of the item taking the entire width (spread). The spine manager
   * might not know that it is a pre-paginated because of missing meta and will not give
   * any blank page instruction.
   *
   * To fix the issue we manually add a blank page at the end if none were demanded
   *
   * @important
   * This fix might not be needed anymore if:
   *
   * - the core handle this kind of fake reflowable and insert blank page
   */
  reader.hookManager.register(
    `item.onAfterLayout`,
    ({ item, blankPagePosition, minimumWidth }) => {
      const spineItem = reader.spineItemsManager.get(item.id)

      if (!(spineItem?.item.renditionLayout === `reflowable`)) return

      const { viewportDimensions } = spineItem?.getViewPortInformation() ?? {}
      const { width: pageWidth } = reader.context.getPageSize()
      const frameElement =
        spineItem?.spineItemFrame.getManipulableFrame()?.frame

      if (viewportDimensions) {
        const spineManagerWantAFullWidthItem = pageWidth < minimumWidth
        const noBlankPageAsked = blankPagePosition === `none`

        if (noBlankPageAsked && spineManagerWantAFullWidthItem) {
          frameElement?.style.setProperty(
            `left`,
            reader.context.isRTL() ? `75%` : `25%`,
          )
        }
      }
    },
  )
}

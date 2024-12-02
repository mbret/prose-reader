import { Report } from "../../report"
import { SpineItemLocator } from "../../spineItem/locationResolver"
import { SpineItem } from "../../spineItem/SpineItem"
import { generateCfi } from "./generateCfi"
import { getRootCfi } from "./getRootCfi"

/**
 * Heavy cfi hookup. Use it to have a refined, precise cfi anchor. It requires the content to be loaded otherwise
 * it will return a root cfi.
 *
 * @todo optimize
 */
export const generateCfiForSpineItemPage = Report.measurePerformance(
  `getCfi`,
  10,
  ({
    pageIndex,
    spineItem,
    spineItemLocator,
  }: {
    pageIndex: number
    spineItem: SpineItem
    spineItemLocator: SpineItemLocator
  }) => {
    const nodeOrRange = spineItemLocator.getFirstNodeOrRangeAtPage(
      pageIndex,
      spineItem,
    )

    const rendererElement = spineItem.renderer.getDocumentFrame()

    if (
      nodeOrRange &&
      rendererElement instanceof HTMLIFrameElement &&
      rendererElement.contentWindow?.document
    ) {
      const cfiString = generateCfi(
        nodeOrRange.node,
        nodeOrRange.offset,
        spineItem.item,
      )

      return cfiString.trim()
    }

    return getRootCfi(spineItem)
  },
)

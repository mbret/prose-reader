import { Report } from "../../report"
import { SpineItem } from "../../spineItem/createSpineItem"
import { SpineItemLocator } from "../../spineItem/locationResolver"
import { CfiHandler } from "../CfiHandler"
import { getItemAnchor } from "./getItemAnchor"
import { getRootCfi } from "./getRootCfi"

/**
 * Heavy cfi hookup. Use it to have a refined, precise cfi anchor. It requires the content to be loaded otherwise
 * it will return a root cfi.
 *
 * @todo optimize
 */
export const getCfi = Report.measurePerformance(
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
    const doc =
      spineItem.frame.getManipulableFrame()?.frame?.contentWindow
        ?.document

    const itemAnchor = getItemAnchor(spineItem)
    // because the current cfi library does not works well with offset we are just using custom
    // format and do it manually after resolving the node
    // @see https://github.com/fread-ink/epub-cfi-resolver/issues/8
    const offset = `|[prose~offset~${nodeOrRange?.offset || 0}]`

    if (nodeOrRange && doc) {
      const cfiString = CfiHandler.generate(
        nodeOrRange.node,
        0,
        `${itemAnchor}${offset}`,
      )

      return cfiString
    }

    return getRootCfi(spineItem)
  },
)

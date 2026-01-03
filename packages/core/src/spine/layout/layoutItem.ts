import { map, type Observable } from "rxjs"
import type { SpineItem } from "../.."
import type { Context } from "../../context/Context"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { Viewport } from "../../viewport/Viewport"
import { SpineItemSpineLayout } from "../types"

export const layoutItem = ({
  horizontalOffset,
  verticalOffset,
  context,
  settings,
  spreadPosition,
  isLastItem,
  isScreenStartItem,
  item,
  viewport,
}: {
  horizontalOffset: number
  verticalOffset: number
  context: Context
  settings: ReaderSettingsManager
  item: SpineItem
  viewport: Viewport
  spreadPosition: "left" | "right" | "none"
  isLastItem: boolean
  isScreenStartItem: boolean
}): Observable<{
  horizontalOffset: number
  verticalOffset: number
  layoutPosition: SpineItemSpineLayout
}> => {
  // we trigger an item layout which will update the visual and return
  // us with the item new eventual layout information.
  // This step is not yet about moving item or adjusting position.
  const itemLayout$ = item.layout.layout({
    spreadPosition,
    horizontalOffset,
    isLastItem,
  })

  return itemLayout$.pipe(
    map(({ width, height }) => {
      if (settings.values.computedPageTurnDirection === `vertical`) {
        const currentValidEdgeYForVerticalPositioning = isScreenStartItem
          ? verticalOffset
          : verticalOffset - viewport.absoluteViewport.height
        const currentValidEdgeXForVerticalPositioning = isScreenStartItem
          ? 0
          : horizontalOffset

        if (context.isRTL()) {
          item.layout.adjustPositionOfElement({
            top: currentValidEdgeYForVerticalPositioning,
            left: currentValidEdgeXForVerticalPositioning,
          })
        } else {
          item.layout.adjustPositionOfElement({
            top: currentValidEdgeYForVerticalPositioning,
            left: currentValidEdgeXForVerticalPositioning,
          })
        }

        const newEdgeX = width + currentValidEdgeXForVerticalPositioning
        const newEdgeY = height + currentValidEdgeYForVerticalPositioning

        const layoutPosition = new SpineItemSpineLayout({
          left: currentValidEdgeXForVerticalPositioning,
          right: newEdgeX,
          top: currentValidEdgeYForVerticalPositioning,
          bottom: newEdgeY,
          height,
          width,
          x: currentValidEdgeXForVerticalPositioning,
          y: currentValidEdgeYForVerticalPositioning,
        })

        return {
          horizontalOffset: newEdgeX,
          verticalOffset: newEdgeY,
          layoutPosition,
        }
      }

      // We can now adjust the position of the item if needed based on its new layout.
      // For simplification we use an edge offset, which means for LTR it will be x from left and for RTL
      // it will be x from right
      item.layout.adjustPositionOfElement(
        context.isRTL()
          ? { right: horizontalOffset, top: 0 }
          : { left: horizontalOffset, top: 0 },
      )

      const left = context.isRTL()
        ? viewport.absoluteViewport.width - horizontalOffset - width
        : horizontalOffset

      const layoutPosition = new SpineItemSpineLayout({
        right: context.isRTL()
          ? viewport.absoluteViewport.width - horizontalOffset
          : horizontalOffset + width,
        left,
        x: left,
        top: verticalOffset,
        bottom: height,
        height,
        width,
        y: verticalOffset,
      })

      return {
        horizontalOffset: horizontalOffset + width,
        verticalOffset: 0,
        layoutPosition,
      }
    }),
  )
}

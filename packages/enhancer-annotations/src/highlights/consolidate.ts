import { Reader } from "@prose-reader/core"
import { Highlight } from "./Highlight"
import { map, of, tap, withLatestFrom } from "rxjs"

export const consolidate = (highlight: Highlight, reader: Reader) => {
  const { itemIndex } = reader.cfi.parseCfi(highlight.anchorCfi ?? "")
  const spineItem = reader.spineItemsManager.get(itemIndex)

  if (!spineItem) return of(highlight)

  return of(highlight).pipe(
    withLatestFrom(spineItem.isReady$),
    tap(([, isItemReady]) => {
      const resolvedAnchorCfi = reader.cfi.resolveCfi({ cfi: highlight.anchorCfi ?? "" })
      const resolvedFocusCfi = reader.cfi.resolveCfi({ cfi: highlight.focusCfi ?? "" })

      if (spineItem.item.renditionLayout === `pre-paginated`) {
        highlight.spineItemPageIndex = 0
      } else {
        if (resolvedAnchorCfi?.node) {
          highlight.spineItemPageIndex = reader.spine.locator.spineItemLocator.getSpineItemPageIndexFromNode(
            resolvedAnchorCfi.node,
            resolvedAnchorCfi.offset ?? 0,
            spineItem,
          )
        }
      }

      if (resolvedAnchorCfi?.node && resolvedFocusCfi?.node && isItemReady) {
        const range = reader.selection.createRangeFromSelection({
          selection: {
            anchorNode: resolvedAnchorCfi.node,
            anchorOffset: resolvedAnchorCfi.offset ?? 0,
            focusNode: resolvedFocusCfi.node,
            focusOffset: resolvedFocusCfi.offset ?? 0,
          },
          spineItem,
        })

        highlight.range = range
        highlight.selectionAsText = range?.toString()
      } else {
        highlight.range = undefined
      }

      if (highlight.spineItemPageIndex !== undefined) {
        highlight.absolutePageIndex = reader.spine.locator.getAbsolutePageIndexFromPageIndex({
          pageIndex: highlight.spineItemPageIndex,
          spineItemOrId: spineItem,
        })
      }
    }),
    map(() => highlight),
  )
}

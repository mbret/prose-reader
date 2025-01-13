import { Reader } from "@prose-reader/core"
import { Highlight } from "./Highlight"
import { map, of, tap, withLatestFrom } from "rxjs"

export const consolidate = (highlight: Highlight, reader: Reader) => {
  const { itemIndex } = reader.cfi.parseCfi(highlight.cfi ?? "")
  const spineItem = reader.spineItemsManager.get(itemIndex)

  if (!spineItem) return of(highlight)

  return of(highlight).pipe(
    withLatestFrom(spineItem.isReady$),
    tap(([, isItemReady]) => {
      const startCfi = reader.cfi.resolveCfi({ cfi: highlight.cfi ?? "" })
      const resolvedFocusCfi = reader.cfi.resolveCfi({
        cfi: highlight.endCfi ?? "",
      })

      if (startCfi?.node && resolvedFocusCfi?.node && isItemReady) {
        const range = startCfi?.node.ownerDocument?.createRange()
        range?.setStart(startCfi?.node, startCfi.offset ?? 0)
        range?.setEnd(resolvedFocusCfi?.node, resolvedFocusCfi.offset ?? 0)

        highlight.range = range
        highlight.selectionAsText = range?.toString()
      } else {
        highlight.range = undefined
      }
    }),
    map(() => highlight),
  )
}

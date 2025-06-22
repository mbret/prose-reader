import { useObserve } from "reactjrx"
import { of } from "rxjs"
import { useSpineItem } from "./useSpineItem"

export const useSpineItemReady = ({
  absolutePageIndex,
  itemIndex,
}: { absolutePageIndex?: number; itemIndex?: number }) => {
  const { spineItem } = useSpineItem({ absolutePageIndex, itemIndex })
  const isItemReady = useObserve(
    () => spineItem?.isReady$ ?? of(false),
    [spineItem],
  )

  return isItemReady
}

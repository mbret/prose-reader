import { useObserve } from "reactjrx"
import { of } from "rxjs"
import { useSpineItem } from "./useSpineItem"

export const useSpineItemReady = ({
  absolutePageIndex,
  itemIndex,
}: {
  absolutePageIndex?: number
  itemIndex?: number
}) => {
  const { spineItem } = useSpineItem({ absolutePageIndex, itemIndex })
  const isReady = useObserve(
    () => spineItem?.isReady$ ?? of(false),
    [spineItem],
  )

  return { spineItem, isReady }
}

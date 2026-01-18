import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { useSpineItem } from "./useSpineItem"

export const useSpineItemReady = ({
  absolutePageIndex,
  itemIndex,
}: {
  absolutePageIndex?: number
  itemIndex?: number
}) => {
  const { data: spineItem } = useSpineItem({ absolutePageIndex, itemIndex })
  const { data: isReady } = useObserve(
    () => (!spineItem ? NEVER : spineItem.isReady$),
    [spineItem],
  )

  return { spineItem, isReady }
}

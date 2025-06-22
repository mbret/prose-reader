import { useMemo } from "react"
import { useObserve } from "reactjrx"
import { useReader } from "../context/useReader"

export const useSpineItem = ({
  absolutePageIndex,
  itemIndex,
}: { absolutePageIndex?: number; itemIndex?: number }) => {
  const reader = useReader()

  const items = useObserve(
    () => reader?.spine.spineItemsManager.items$,
    [reader],
  )

  const spineItem = useMemo(() => {
    void items

    if (itemIndex !== undefined)
      return reader?.spine.spineItemsManager.get(itemIndex)

    if (absolutePageIndex !== undefined) {
      const { itemIndex } =
        reader?.spine.locator.getSpineInfoFromAbsolutePageIndex({
          absolutePageIndex,
        }) ?? {}

      return reader?.spine.spineItemsManager.get(itemIndex)
    }

    return undefined
  }, [itemIndex, absolutePageIndex, reader, items])

  return {
    spineItem,
  }
}

import { useObserve } from "reactjrx"
import { EMPTY, map, of } from "rxjs"
import { useReader } from "../context/useReader"

export const useSpineItem = ({
  absolutePageIndex,
  itemIndex,
}: {
  absolutePageIndex?: number
  itemIndex?: number
}) => {
  const reader = useReader()

  const spineItem = useObserve(() => {
    if (!reader) return EMPTY

    if (itemIndex !== undefined)
      return of(reader.spine.spineItemsManager.get(itemIndex))

    if (absolutePageIndex !== undefined) {
      return reader.spine.pages
        .observeFromAbsolutePageIndex(absolutePageIndex)
        .pipe(
          map((page) => reader.spine.spineItemsManager.get(page?.itemIndex)),
        )
    }

    return EMPTY
  }, [itemIndex, absolutePageIndex, reader])

  return {
    spineItem,
  }
}

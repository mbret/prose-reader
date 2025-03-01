import {
  type Observable,
  animationFrameScheduler,
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  withLatestFrom,
} from "rxjs"
import type { Reader } from "../../reader"
import { isShallowEqual } from "../../utils/objects"

export const getNumberOfPagesForAllSpineItems = (reader: Reader) =>
  reader.spineItemsManager.items.map((item) => {
    const { height, width } = item.layout.layoutInfo

    return reader.spine.spineItemLocator.getSpineItemNumberOfPages({
      isUsingVerticalWriting: !!item.isUsingVerticalWriting(),
      itemHeight: height,
      itemWidth: width,
    })
  }, 0)

export const trackTotalPages = (reader: Reader) => {
  const totalPages$: Observable<{
    numberOfPagesPerItems: number[]
    numberOfTotalPages: number
  }> = reader.layout$.pipe(
    debounceTime(10, animationFrameScheduler),
    withLatestFrom(reader.pagination.state$),
    map(() => {
      // @todo trigger change to pagination info (+ memo if number is same)
      const numberOfPagesPerItems = getNumberOfPagesForAllSpineItems(reader)

      return {
        numberOfPagesPerItems,
        /**
         * This may be not accurate for reflowable due to dynamic load / unload.
         */
        numberOfTotalPages: numberOfPagesPerItems.reduce(
          (acc, numberOfPagesForItem) => acc + numberOfPagesForItem,
          0,
        ),
      }
    }),
    distinctUntilChanged(isShallowEqual),
    startWith({
      numberOfPagesPerItems: [],
      numberOfTotalPages: 0,
    }),
  )

  return totalPages$
}

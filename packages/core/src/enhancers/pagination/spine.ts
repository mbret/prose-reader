import {
  Observable,
  debounceTime,
  animationFrameScheduler,
  withLatestFrom,
  map,
  distinctUntilChanged,
  startWith,
} from "rxjs"
import { calculateNumberOfPagesForItem } from "../../pagination/pagination"
import { Reader } from "../../reader"
import { SpineItem } from "../../spineItem/createSpineItem"
import { isShallowEqual } from "../../utils/objects"

export const getSpineItemNumberOfPages = ({
  spineItem,
  reader,
}: {
  spineItem: SpineItem
  reader: Reader
}) => {
  // pre-paginated always are only one page
  // if (!spineItem.isReflowable) return 1

  const writingMode = spineItem.spineItemFrame.getWritingMode()
  const { width, height } = spineItem.getElementDimensions()
  const settings = reader.settings.settings

  if (
    settings.pageTurnDirection === `vertical` &&
    settings.pageTurnMode === `scrollable`
  ) {
    return 1
  }

  if (writingMode === `vertical-rl`) {
    return calculateNumberOfPagesForItem(
      height,
      reader.context.getPageSize().height,
    )
  }

  return calculateNumberOfPagesForItem(
    width,
    reader.context.getPageSize().width,
  )
}

export const getNumberOfPagesForAllSpineItems = (reader: Reader) =>
  reader.spineItemManager.getAll().map((item) => {
    return getSpineItemNumberOfPages({ spineItem: item, reader })
  }, 0)

export const trackTotalPages = (reader: Reader) => {
  const totalPages$: Observable<{
    numberOfPagesPerItems: number[]
    numberOfTotalPages: number
  }> = reader.spine.$.layout$.pipe(
    debounceTime(10, animationFrameScheduler),
    withLatestFrom(reader.pagination.paginationInfo$),
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

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

export const trackTotalPages = (reader: Reader) => {
  const totalPages$: Observable<{
    numberOfPagesPerItems: number[]
    numberOfTotalPages: number
  }> = reader.spine.spineLayout.layout$.pipe(
    debounceTime(10, animationFrameScheduler),
    withLatestFrom(reader.pagination.state$),
    map(() => {
      return {
        numberOfPagesPerItems: reader.spineItemsManager.items.reduce(
          (acc, item) => {
            return [...acc, item.numberOfPages]
          },
          [] as number[],
        ),
        /**
         * This may be not accurate for reflowable due to dynamic load / unload.
         */
        numberOfTotalPages: reader.spine.spineLayout.numberOfPages,
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

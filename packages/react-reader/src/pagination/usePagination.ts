import { useObserve } from "reactjrx"
import { useReader } from "../context/useReader"
import { combineLatest, map, NEVER } from "rxjs"

export const usePagination = () => {
  const reader = useReader()

  return useObserve(
    () =>
      !reader
        ? NEVER
        : combineLatest([reader.pagination.state$, reader.context.state$]).pipe(
            map(([state, context]) => ({
              ...state,
              hasChapters: !context.isFullyPrePaginated,
            })),
          ),
    [reader],
  )
}

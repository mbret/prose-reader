import type { Reader } from "@prose-reader/core"
import { useObserve } from "reactjrx"
import { combineLatest, map, NEVER } from "rxjs"
import { useReader } from "../context/useReader"

export const usePagination = ():
  | (Reader["pagination"]["state"] & { hasChapters: boolean })
  | undefined => {
  const reader = useReader()

  return useObserve(
    () =>
      !reader
        ? NEVER
        : combineLatest([reader.pagination.state$, reader.context]).pipe(
            map(([state, context]) => {
              const isOnlyImages = context.manifest?.spineItems.every((item) =>
                item.mediaType?.startsWith("image/"),
              )

              return {
                ...state,
                hasChapters: !context.isFullyPrePaginated && !isOnlyImages,
              }
            }),
          ),
    [reader],
  )
}

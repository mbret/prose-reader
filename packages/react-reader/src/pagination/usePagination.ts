import type { Reader } from "@prose-reader/core"
import { useObserve } from "reactjrx"
import { NEVER, combineLatest, map } from "rxjs"
import { useReader } from "../context/useReader"

export const usePagination = ():
  | (Reader["pagination"]["state"] & { hasChapters: boolean })
  | undefined => {
  const reader = useReader()

  return useObserve(
    () =>
      !reader
        ? NEVER
        : combineLatest([reader.pagination.state$, reader.context.state$]).pipe(
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

import { useEffect } from "react"
import { SIGNAL_RESET, signal, useObserve } from "reactjrx"
import { useReader } from "./useReader"

export const usePagination = () => {
  const { reader } = useReader()

  return useObserve(() => reader?.pagination.state$, [reader])
}

export const useIsPrePaginated = () => {
  const { reader } = useReader()
  const { data: manifest } = useObserve(
    () => reader?.context.manifest$,
    [reader],
  )

  return (
    manifest?.renditionLayout === "pre-paginated" ||
    manifest?.spineItems.every(
      (item) => item.renditionLayout === "pre-paginated",
    )
  )
}

export const useIsComics = () => {
  const { reader } = useReader()
  const { data: manifest } = useObserve(
    () => reader?.context.manifest$,
    [reader],
  )
  const isPrePaginated = useIsPrePaginated()

  return (
    isPrePaginated ||
    // webtoon
    (manifest?.renditionFlow === `scrolled-continuous` &&
      manifest.renditionLayout === `reflowable` &&
      manifest?.spineItems.every((item) =>
        item.mediaType?.startsWith(`image/`),
      ))
  )
}

export const isQuickMenuOpenSignal = signal({
  key: `isQuickMenuOpenSignal`,
  default: false,
})

export const useResetStateOnUnMount = () => {
  useEffect(() => {
    return () => {
      isQuickMenuOpenSignal.update(SIGNAL_RESET)
    }
  }, [])
}

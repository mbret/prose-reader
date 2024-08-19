import { useEffect } from "react"
import { useReader } from "./useReader"
import { signal, SIGNAL_RESET, useObserve } from "reactjrx"
import { NEVER } from "rxjs"

export const isSearchOpenState = signal({
  key: `isSearchOpenState`,
  default: false
})

export const isTocOpenState = signal({
  key: `isTocOpenState`,
  default: false
})

export const isHelpOpenState = signal({
  key: `isHelpOpenState`,
  default: false
})

export const usePagination = () => {
  const { reader } = useReader()

  return useObserve(() => reader?.pagination.state$ ?? NEVER, [reader])
}

export const useIsComics = () => {
  const { reader } = useReader()
  const manifest = useObserve(reader?.context.manifest$ ?? NEVER)

  return (
    manifest?.renditionLayout === "pre-paginated" ||
    manifest?.spineItems.every((item) => item.renditionLayout === "pre-paginated") ||
    // webtoon
    (manifest?.renditionFlow === `scrolled-continuous` &&
      manifest.renditionLayout === `reflowable` &&
      manifest?.spineItems.every((item) => item.mediaType?.startsWith(`image/`)))
  )
}

export const isMenuOpenState = signal({
  key: `isMenuOpenState`,
  default: false
})

export const currentHighlight = signal<{ anchorCfi: string; focusCfi: string; text?: string; id: string } | undefined>({
  key: `currentHighlightState`,
  default: undefined
})

export const useResetStateOnUnMount = () => {
  useEffect(() => {
    return () => {
      isMenuOpenState.setValue(SIGNAL_RESET)
      isSearchOpenState.setValue(SIGNAL_RESET)
      isTocOpenState.setValue(SIGNAL_RESET)
      isHelpOpenState.setValue(SIGNAL_RESET)
      currentHighlight.setValue(SIGNAL_RESET)
    }
  }, [])
}

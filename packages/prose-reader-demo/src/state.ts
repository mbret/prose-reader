import { atom, selector, useRecoilCallback } from "recoil"
import { Manifest } from "@prose-reader/core"
import { useEffect } from "react"

export const isSearchOpenState = atom({
  key: `isSearchOpenState`,
  default: false
})

export const isTocOpenState = atom({
  key: `isTocOpenState`,
  default: false
})

export const isHelpOpenState = atom({
  key: `isHelpOpenState`,
  default: false
})

export const bookTitleState = selector({
  key: `bookTitleState`,
  get: ({ get }) => {
    return get(manifestState)?.title
  }
})

export const bookReadyState = atom({
  key: `bookReadyState`,
  default: false
})

export const manifestState = atom<Manifest | undefined>({
  key: `manifestState`,
  default: undefined
})

export const isComicState = selector({
  key: `isComicState`,
  get: ({ get }) => {
    const manifest = get(manifestState)

    return (
      manifest?.renditionLayout === "pre-paginated" ||
      manifest?.spineItems.every((item) => item.renditionLayout === "pre-paginated") ||
      // webtoon
      (manifest?.renditionFlow === `scrolled-continuous` &&
        manifest.renditionLayout === `reflowable` &&
        manifest?.spineItems.every((item) => item.mediaType?.startsWith(`image/`)))
    )
  }
})

export const isMenuOpenState = atom({
  key: `isMenuOpenState`,
  default: false
})

export const currentHighlight = atom<{ anchorCfi: string; focusCfi: string; text?: string; id: string } | undefined>({
  key: `currentHighlightState`,
  default: undefined
})

export const hasCurrentHighlightState = selector({
  key: `hasCurrentHighlightState`,
  get: ({ get }) => {
    return !!get(currentHighlight)
  }
})

export const isZoomingState = atom<boolean>({
  key: `isZoomingState`,
  default: false
})

const statesToReset = [isMenuOpenState, manifestState, bookReadyState, currentHighlight]

export const useResetStateOnUnMount = () => {
  const resetStates = useRecoilCallback(
    ({ reset }) =>
      () => {
        statesToReset.forEach((state) => reset(state))
      },
    []
  )

  useEffect(() => {
    return () => resetStates()
  }, [resetStates])
}

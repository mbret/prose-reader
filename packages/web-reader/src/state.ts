import { atom, selector, useRecoilCallback } from "recoil";
import { Reader, Manifest } from "@oboku/reader";
import { useEffect } from "react";

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

export const paginationState = atom<ReturnType<Reader['getPaginationInfo']> | undefined>({
  key: `paginationState`,
  default: undefined
})

export const isComicState = selector({
  key: `isComicState`,
  get: ({ get }) => {
    const manifest = get(manifestState)

    return manifest?.renditionLayout === 'pre-paginated' || manifest?.readingOrder.every(item => item.renditionLayout === 'pre-paginated')
  }
})

export const isMenuOpenState = atom({
  key: `isMenuOpenState`,
  default: false
})

export const currentHighlight = atom<{ anchorCfi: string, focusCfi: string, text?: string, id?: number } | undefined>({
  key: `currentHighlightState`,
  default: undefined
})

export const hasCurrentHighlightState = selector({
  key: `hasCurrentHighlightState`,
  get: ({ get }) => {
    return !!get(currentHighlight)
  }
})

const statesToReset = [
  isMenuOpenState,
  paginationState,
  manifestState,
  bookReadyState,
  currentHighlight,
]

export const useResetStateOnUnMount = () => {
  const resetStates = useRecoilCallback(({ reset }) => () => {
    statesToReset.forEach(state => reset(state))
  }, [])

  useEffect(() => {
    return () => resetStates()
  }, [resetStates])
}
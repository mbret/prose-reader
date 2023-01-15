import { useEffect, useState } from "react"
import { ReaderInstance } from "./types"
import { createHighlightsEnhancer } from "@prose-reader/enhancer-highlights"
import { tap } from "rxjs/operators"
import { useSetRecoilState } from "recoil"
import { currentHighlight, isMenuOpenState } from "./state"

export const useHighlights = (reader: ReaderInstance | undefined) => {
  const [enhancer, setEnhancer] = useState<ReturnType<typeof createHighlightsEnhancer> | undefined>(undefined)
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)
  const setCurrentSelection = useSetRecoilState(currentHighlight)

  useEffect(() => {
    const readerSubscription = reader?.$.selection$
      .pipe(
        tap((data) => {
          if (data?.toString() !== ``) {
            const anchorCfi = data?.getAnchorCfi()
            const focusCfi = data?.getFocusCfi()

            if (anchorCfi && focusCfi) {
              const highlight = { anchorCfi, focusCfi, text: data?.toString() }
              setCurrentSelection(highlight)
              setMenuOpenState(false)
            }
          } else {
            setCurrentSelection(undefined)
          }
        })
      )
      .subscribe()

    return () => {
      readerSubscription?.unsubscribe()
    }
  }, [reader, setMenuOpenState])

  useEffect(() => {
    const subscription = reader?.highlights.$.pipe(
      tap((event) => {
        if (event.type === `onHighlightClick`) {
          setCurrentSelection(event.data)
          setMenuOpenState(false)
        }

        if (event.type === `onUpdate`) {
          const toStore = event.data.map(({ anchorCfi, focusCfi }) => ({ anchorCfi, focusCfi }))
          localStorage.setItem(`highlights`, JSON.stringify(toStore))
        }
      })
    ).subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [setCurrentSelection, setMenuOpenState, reader])

  // create bookmarks enhancer and initialize with local storage bookmarks
  useEffect(() => {
    const storedHighlights = JSON.parse(localStorage.getItem(`highlights`) || `[]`)

    const createdEnhancer = createHighlightsEnhancer({ highlights: storedHighlights })

    setEnhancer(() => createdEnhancer)
  }, [])

  return enhancer
}

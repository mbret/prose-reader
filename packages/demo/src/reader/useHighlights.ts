import { useEffect } from "react"
import { tap } from "rxjs/operators"
import { currentHighlight, isMenuOpenState } from "./states"
import { ReaderInstance } from "./useCreateReader"

export const useHighlights = (reader: ReaderInstance | undefined) => {

  // @todo
  // useEffect(() => {
  //   const readerSubscription = reader?.$.selection$
  //     .pipe(
  //       tap((data) => {
  //         if (data?.toString() !== ``) {
  //           const anchorCfi = data?.getAnchorCfi()
  //           const focusCfi = data?.getFocusCfi()

  //           if (anchorCfi && focusCfi) {
  //             const highlight = { anchorCfi, focusCfi, text: data?.toString(), id: new Date().getTime().toString() }
  //             setCurrentSelection(highlight)
  //             setMenuOpenState(false)
  //           }
  //         } else {
  //           setCurrentSelection(undefined)
  //         }
  //       })
  //     )
  //     .subscribe()

  //   return () => {
  //     readerSubscription?.unsubscribe()
  //   }
  // }, [reader, setMenuOpenState])

  useEffect(() => {
    const subscription = reader?.highlights.$.pipe(
      tap((event) => {
        if (event.type === `onHighlightClick`) {
          currentHighlight.setValue(event.data)
          isMenuOpenState.setValue(false)
        }

        if (event.type === `onUpdate`) {
          const toStore = event.data.map(({ anchorCfi, focusCfi, id }) => ({ anchorCfi, focusCfi, id }))
          localStorage.setItem(`highlights`, JSON.stringify(toStore))
        }
      })
    ).subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [reader])

  // create bookmarks enhancer and initialize with local storage bookmarks
  useEffect(() => {
    if (!reader) return

    const storedHighlights = JSON.parse(localStorage.getItem(`highlights`) || `[]`)

    reader.highlights.add(storedHighlights)
  }, [reader])
}

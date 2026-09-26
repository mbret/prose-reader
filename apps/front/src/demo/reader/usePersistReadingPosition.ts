import { useCallback } from "react"
import { useSubscribe } from "reactjrx"
import { useReader } from "./useReader"

export const getReadingPositionKey = (bookKey: string) =>
  `book-${bookKey}-reading-position`

/**
 * Saves where the reader is in this book, so it reopens there. The reading
 * position only moves when the reader navigates; the visible range moves
 * whenever the book is laid out again, and saving it would reopen the book a
 * page back after a rotation.
 *
 * Until the reader has found where a navigation took it, the reading position
 * is a stand-in, such as the chapter start while the chapter loads. A cfi the
 * reader was sent to, such as the one the book opened at, is finer: it is
 * saved instead, and any other stand-in leaves the saved position as it is.
 */
export const usePersistReadingPosition = (bookKey: string) => {
  const { reader } = useReader()

  const persistReadingPosition = useCallback(
    () =>
      reader?.navigation.readingPosition$.subscribe(({ cfi, isFinal }) => {
        const { target } = reader.navigation.getNavigation()
        const cfiToSave = isFinal
          ? cfi
          : target.type === "cfi"
            ? target.value
            : undefined

        if (cfiToSave === undefined) return

        localStorage.setItem(getReadingPositionKey(bookKey), cfiToSave)
      }),
    [reader, bookKey],
  )

  useSubscribe(persistReadingPosition)
}

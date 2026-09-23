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
 */
export const usePersistReadingPosition = (bookKey: string) => {
  const { reader } = useReader()

  const persistReadingPosition = useCallback(
    () =>
      reader?.navigation.readingPosition$.subscribe((cfi) => {
        localStorage.setItem(getReadingPositionKey(bookKey), cfi)
      }),
    [reader, bookKey],
  )

  useSubscribe(persistReadingPosition)
}

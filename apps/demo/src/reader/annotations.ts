import type { Annotation } from "@prose-reader/enhancer-annotations"
import { useSubscribe } from "reactjrx"
import { debounceTime, type Observable, tap } from "rxjs"

export const restoreAnnotations = (bookKey: string): Annotation[] => {
  const storedData = JSON.parse(localStorage.getItem(`annotations`) || `{}`)
  const restored = storedData[bookKey] || ([] as Annotation[])

  return restored
}

export const persistAnnotations = (
  bookKey: string,
  annotations: Annotation[],
) => {
  const existing = JSON.parse(localStorage.getItem(`annotations`) || `{}`)

  localStorage.setItem(
    `annotations`,
    JSON.stringify({
      ...existing,
      [bookKey]: annotations,
    }),
  )
}

export const usePersistAnnotations = (
  annotations: Observable<Annotation[]>,
  bookKey: string,
) => {
  useSubscribe(() => {
    return annotations.pipe(
      debounceTime(500),
      tap((annotations) => {
        persistAnnotations(bookKey, annotations)
      }),
    )
  }, [annotations, bookKey])
}

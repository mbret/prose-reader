import { useObserve } from "reactjrx"
import { map } from "rxjs"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations"

export const useCanBookmarkPage = (absolutePageIndex: number) => {
  const reader = useReaderWithAnnotations()

  return useObserve(
    () =>
      reader?.annotations.candidates$.pipe(
        map((candidates) => candidates[absolutePageIndex]),
      ),
    [reader],
  )
}

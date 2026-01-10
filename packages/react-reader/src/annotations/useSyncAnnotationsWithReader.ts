import { useSubscribe } from "reactjrx"
import { combineLatest, distinctUntilChanged, map } from "rxjs"
import { useReaderContext } from "../context/useReaderContext"
import { useReaderWithAnnotations } from "./useReaderWithAnnotations"

export const useSyncAnnotationsWithReader = () => {
  const reader = useReaderWithAnnotations()
  const context = useReaderContext()

  useSubscribe(() => {
    if (reader) {
      const selectedHighlight$ = context.pipe(
        map((context) => context.selectedHighlight?.highlight?.id),
        distinctUntilChanged(),
      )

      const annotations$ = context.pipe(
        map((context) => context.annotations ?? []),
        distinctUntilChanged(),
      )

      const annotationsWithSelected$ = combineLatest([
        annotations$,
        selectedHighlight$,
      ]).pipe(
        map(([annotations, selectedHighlight]) =>
          annotations.map((annotation) => ({
            ...annotation,
            selected: annotation.id === selectedHighlight,
          })),
        ),
      )

      reader.annotations.update({ annotations$: annotationsWithSelected$ })
    }
  }, [reader, context])
}

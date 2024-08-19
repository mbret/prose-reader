import { useCallback } from "react"
import { createAppReader, ReaderInstance } from "../types"
import { isDefined, signal, useSignalValue } from "reactjrx"
import { filter } from "rxjs"

export const readerSignal = signal<ReaderInstance | undefined>({
  default: undefined
})

const reader$ = readerSignal.subject.pipe(filter(isDefined))

export const useReader = () => {
  const reader = useSignalValue(readerSignal)

  const setReader = useCallback((readerInstance: ReturnType<typeof createAppReader>) => {
    readerSignal.setValue(readerInstance)
  }, [])

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.reader = reader

  return { reader, setReader, reader$ }
}

import { signal, useSignalValue } from "reactjrx"
import type { ReaderInstance } from "./useCreateReader"

export const readerSignal = signal<ReaderInstance | undefined>({})

export const useReader = () => {
  const reader = useSignalValue(readerSignal)

  // @ts-ignore
  window.reader = reader

  return { reader }
}

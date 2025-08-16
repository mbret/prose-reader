import { signal, useSignalValue } from "reactjrx"
import type { ReaderInstance } from "./useCreateReader"

export const readerSignal = signal<ReaderInstance | undefined>({})

export const useReader = () => {
  const reader = useSignalValue(readerSignal)

  // @ts-expect-error
  window.reader = reader

  return { reader }
}

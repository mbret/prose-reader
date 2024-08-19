import { ReaderInstance } from "../types"
import { signal, useSignalValue } from "reactjrx"

export const readerSignal = signal<ReaderInstance | undefined>({
  default: undefined
})

export const useReader = () => {
  const reader = useSignalValue(readerSignal)

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.reader = reader

  return { reader }
}

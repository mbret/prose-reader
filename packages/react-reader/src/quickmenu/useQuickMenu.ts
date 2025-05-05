import { useSignalValue } from "reactjrx"
import { useReaderContext } from "../context/useReaderContext"

export const useQuickMenu = () => {
  const { quickMenuSignal } = useReaderContext()

  const quickMenu = useSignalValue(quickMenuSignal)

  return [quickMenu, quickMenuSignal.setValue, quickMenuSignal] as const
}

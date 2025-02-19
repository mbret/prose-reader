import { useContext } from "react"
import { useSignalValue } from "reactjrx"
import { ReaderContext } from "../context/context"

export const useQuickMenu = () => {
  const { quickMenuSignal } = useContext(ReaderContext)

  const quickMenu = useSignalValue(quickMenuSignal)

  return [quickMenu, quickMenuSignal.setValue, quickMenuSignal] as const
}

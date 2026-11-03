import { useEffect } from "react"
import { SIGNAL_RESET, signal } from "reactjrx"

export const isQuickMenuOpenSignal = signal({
  key: `isQuickMenuOpenSignal`,
  default: false,
})

export const useResetStateOnUnMount = () => {
  useEffect(() => {
    return () => {
      isQuickMenuOpenSignal.update(SIGNAL_RESET)
    }
  }, [])
}

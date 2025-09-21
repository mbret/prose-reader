import { useReaderContextValue } from "../context/useReaderContext"

export const useQuickMenu = () => {
  const { quickMenuOpen, onQuickMenuOpenChange } = useReaderContextValue([
    "quickMenuOpen",
    "onQuickMenuOpenChange",
  ])

  return [quickMenuOpen, onQuickMenuOpenChange] as const
}

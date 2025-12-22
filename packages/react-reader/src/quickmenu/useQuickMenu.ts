import { useReaderContextValue } from "../context/useReaderContext"

export const useQuickMenu = () => {
  const {
    quickMenuOpen,
    onQuickMenuOpenChange,
    _quickMenuOpen,
    _onQuickMenuOpenChange,
  } = useReaderContextValue([
    "quickMenuOpen",
    "onQuickMenuOpenChange",
    "_quickMenuOpen",
    "_onQuickMenuOpenChange",
  ])

  return [
    quickMenuOpen ?? _quickMenuOpen,
    onQuickMenuOpenChange ?? _onQuickMenuOpenChange,
  ] as const
}

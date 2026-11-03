import { useReaderViewContext } from "../context/ReaderViewContext"

export const useQuickMenu = () => {
  const { quickMenuOpen, onQuickMenuOpenChange } = useReaderViewContext()

  return [quickMenuOpen, onQuickMenuOpenChange] as const
}

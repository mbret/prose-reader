import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
} from "react"

export type ReaderViewProps = {
  enableFloatingTime?: boolean
  enableFloatingProgress?: boolean
  onItemClick?: (
    item:
      | "annotations"
      | "search"
      | "help"
      | "toc"
      | "bookmarks"
      | "more"
      | "back"
      | "gallery"
      | "layout"
      | "theme",
  ) => void
  /**
   * The quick menu's open state. While it is `undefined`, react-reader keeps
   * its own.
   */
  quickMenuOpen?: boolean
  /** Called with the quick menu's open state each time it changes. */
  onQuickMenuOpenChange?: (open: boolean) => void
}

export type ReaderViewContextType = {
  enableFloatingTime: boolean | undefined
  enableFloatingProgress: boolean
  onItemClick: ReaderViewProps["onItemClick"]
  quickMenuOpen: boolean
  onQuickMenuOpenChange: Dispatch<SetStateAction<boolean>>
  fontSizeMenuOpen: boolean
  onFontSizeMenuOpenChange: (open: boolean) => void
  refitMenuOpen: boolean
  onRefitMenuOpenChange: (open: boolean) => void
}

export const ReaderViewContext = createContext<
  ReaderViewContextType | undefined
>(undefined)

export const useReaderViewContext = () => {
  const readerView = useContext(ReaderViewContext)

  if (!readerView) {
    throw new Error(`react-reader's menus render inside ReactReader`)
  }

  return readerView
}

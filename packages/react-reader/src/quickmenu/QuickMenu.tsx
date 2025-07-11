import { memo } from "react"
import { useSignalValue } from "reactjrx"
import { useReaderContext } from "../context/useReaderContext"
import { BottomBar } from "./BottomBar"
import { TopBar } from "./TopBar"
import { useQuickMenu } from "./useQuickMenu"

export const QuickMenu = memo(
  ({
    onItemClick,
  }: {
    onItemClick: (
      item:
        | "annotations"
        | "search"
        | "help"
        | "toc"
        | "bookmarks"
        | "more"
        | "back"
        | "gallery",
    ) => void
  }) => {
    const [quickMenuOpen] = useQuickMenu()
    const { refitMenuSignal } = useReaderContext()
    const refitMenu = useSignalValue(refitMenuSignal)

    return (
      <>
        <TopBar open={quickMenuOpen && !refitMenu} onItemClick={onItemClick} />
        <BottomBar
          open={quickMenuOpen && !refitMenu}
          onItemClick={onItemClick}
        />
      </>
    )
  },
)

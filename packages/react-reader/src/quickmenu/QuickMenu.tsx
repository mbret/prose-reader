import { memo } from "react"
import { useReaderContextValue } from "../context/useReaderContext"
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
    const { refitMenuOpen, fontSizeMenuOpen, selectedHighlight } =
      useReaderContextValue([
        "refitMenuOpen",
        "fontSizeMenuOpen",
        "selectedHighlight",
      ])

    return (
      <>
        <TopBar
          open={
            quickMenuOpen &&
            !refitMenuOpen &&
            !fontSizeMenuOpen &&
            !selectedHighlight
          }
          onItemClick={onItemClick}
        />
        <BottomBar
          open={quickMenuOpen && !refitMenuOpen && !fontSizeMenuOpen}
          onItemClick={onItemClick}
        />
      </>
    )
  },
)

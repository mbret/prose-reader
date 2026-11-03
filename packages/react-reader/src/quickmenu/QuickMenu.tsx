import { memo } from "react"
import type { ViewContextType } from "../context/context"
import { useReaderContextValue } from "../context/useReaderContext"
import { BottomBar } from "./BottomBar"
import { TopBar } from "./TopBar"
import { useQuickMenu } from "./useQuickMenu"

export const QuickMenu = memo(
  ({
    onItemClick,
  }: {
    onItemClick: NonNullable<ViewContextType["onItemClick"]>
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

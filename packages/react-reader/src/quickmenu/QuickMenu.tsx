import { memo } from "react"
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
        | "back",
    ) => void
  }) => {
    const [quickMenuOpen] = useQuickMenu()

    return (
      <>
        <TopBar open={quickMenuOpen} onItemClick={onItemClick} />
        <BottomBar open={quickMenuOpen} onItemClick={onItemClick} />
      </>
    )
  },
)

import { memo } from "react"
import { BottomBar } from "./BottomBar"
import { TopBar } from "./TopBar"
import { useQuickMenu } from "./useQuickMenu"

export const QuickMenu = memo(
  ({
    onBackClick,
    onMoreClick,
    onTableOfContentsClick,
    onHelpClick,
    onSearchClick,
  }: {
    onBackClick: () => void
    onMoreClick: () => void
    onTableOfContentsClick: () => void
    onHelpClick: () => void
    onSearchClick: () => void
  }) => {
    const [quickMenuOpen] = useQuickMenu()

    return (
      <>
        <TopBar
          open={quickMenuOpen}
          onBackClick={onBackClick}
          onMoreClick={onMoreClick}
        />
        <BottomBar
          open={quickMenuOpen}
          onTableOfContentsClick={onTableOfContentsClick}
          onHelpClick={onHelpClick}
          onSearchClick={onSearchClick}
        />
      </>
    )
  },
)

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
  }: {
    onBackClick: () => void
    onMoreClick: () => void
    onTableOfContentsClick: () => void
    onHelpClick: () => void
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
        />
      </>
    )
  },
)

import { memo } from "react"
import { BottomBar } from "./BottomBar"
import { TopBar } from "./TopBar"

export const QuickMenu = memo(
  ({
    open,
    onBackClick,
    onMoreClick,
  }: { open: boolean; onBackClick: () => void; onMoreClick: () => void }) => {
    return (
      <>
        <TopBar
          open={open}
          onBackClick={onBackClick}
          onMoreClick={onMoreClick}
        />
        <BottomBar open={open} />
      </>
    )
  },
)

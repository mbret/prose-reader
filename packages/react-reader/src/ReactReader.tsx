import { Presence } from "@chakra-ui/react"
import { useState } from "react"
import { HelpDialog } from "./help/HelpDialog"
import { FloatingProgress } from "./navigation/FloatingProgress"
import { FloatingTime } from "./navigation/FloatingTime"
import { QuickMenu } from "./navigation/QuickMenu/QuickMenu"
import { useQuickMenu } from "./navigation/QuickMenu/useQuickMenu"
import { SearchDialog } from "./search/SearchDialog"
import { TableOfContentsDialog } from "./toc/TableOfContentsDialog"

export const ReactReader = ({
  enableFloatingTime = true,
  enableFloatingProgress = true,
  onBackClick,
  onMoreClick,
}: {
  enableFloatingTime?: boolean
  enableFloatingProgress?: boolean
  onBackClick: () => void
  onMoreClick: () => void
}) => {
  const [isTableOfContentsOpen, setIsTableOfContentsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [quickMenuOpen, setQuickMenuOpen] = useQuickMenu()

  return (
    <>
      {enableFloatingProgress && (
        <Presence
          present={!quickMenuOpen}
          animationName={{ _open: "fade-in", _closed: "fade-out" }}
          animationDuration="moderate"
        >
          <FloatingProgress />
        </Presence>
      )}
      <QuickMenu
        onBackClick={onBackClick}
        onMoreClick={onMoreClick}
        onTableOfContentsClick={() => setIsTableOfContentsOpen(true)}
        onHelpClick={() => setIsHelpOpen(true)}
        onSearchClick={() => setIsSearchOpen(true)}
      />
      <HelpDialog open={isHelpOpen} setOpen={setIsHelpOpen} />
      <TableOfContentsDialog
        open={isTableOfContentsOpen}
        setOpen={setIsTableOfContentsOpen}
        onNavigate={() => {
          setIsTableOfContentsOpen(false)
          setQuickMenuOpen(false)
        }}
      />
      <SearchDialog
        open={isSearchOpen}
        setOpen={setIsSearchOpen}
        onNavigate={() => {
          setIsSearchOpen(false)
          setQuickMenuOpen(false)
        }}
      />
      <Presence
        present={enableFloatingTime || quickMenuOpen}
        animationName={{ _open: "fade-in", _closed: "fade-out" }}
        animationDuration="slow"
        overflow="hidden"
      >
        <FloatingTime />
      </Presence>
    </>
  )
}

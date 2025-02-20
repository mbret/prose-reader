import { Presence } from "@chakra-ui/react"
import { useCallback, useState } from "react"
import { AnnotationsDialog } from "./annotations/AnnotationsDialog"
import { BookmarksDialog } from "./bookmarks/BookmarksDialog"
import { HelpDialog } from "./help/HelpDialog"
import { FloatingProgress } from "./navigation/FloatingProgress"
import { FloatingTime } from "./navigation/FloatingTime"
import { QuickMenu } from "./quickmenu/QuickMenu"
import { useQuickMenu } from "./quickmenu/useQuickMenu"
import { SearchDialog } from "./search/SearchDialog"
import { TableOfContentsDialog } from "./toc/TableOfContentsDialog"

export const ReactReader = ({
  enableFloatingTime = true,
  enableFloatingProgress = true,
  onItemClick,
}: {
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
      | "back",
  ) => void
}) => {
  const [isTableOfContentsOpen, setIsTableOfContentsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAnnotationsOpen, setIsAnnotationsOpen] = useState(false)
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false)
  const [quickMenuOpen, setQuickMenuOpen] = useQuickMenu()

  const onNavigate = useCallback(() => {
    setIsTableOfContentsOpen(false)
    setIsHelpOpen(false)
    setIsSearchOpen(false)
    setIsAnnotationsOpen(false)
    setIsBookmarksOpen(false)
    setQuickMenuOpen(false)
  }, [setQuickMenuOpen])

  const _onItemClick: NonNullable<typeof onItemClick> = useCallback(
    (item) => {
      if (item === "annotations") {
        setIsAnnotationsOpen(true)
      } else if (item === "search") {
        setIsSearchOpen(true)
      } else if (item === "help") {
        setIsHelpOpen(true)
      } else if (item === "toc") {
        setIsTableOfContentsOpen(true)
      } else if (item === "bookmarks") {
        setIsBookmarksOpen(true)
      }
      onItemClick?.(item)
    },
    [onItemClick],
  )

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
      <QuickMenu onItemClick={_onItemClick} />
      <HelpDialog open={isHelpOpen} setOpen={setIsHelpOpen} />
      <TableOfContentsDialog
        open={isTableOfContentsOpen}
        setOpen={setIsTableOfContentsOpen}
        onNavigate={onNavigate}
      />
      <SearchDialog
        open={isSearchOpen}
        setOpen={setIsSearchOpen}
        onNavigate={onNavigate}
      />
      <AnnotationsDialog
        open={isAnnotationsOpen}
        setOpen={setIsAnnotationsOpen}
        onNavigate={onNavigate}
      />
      <BookmarksDialog
        open={isBookmarksOpen}
        setOpen={setIsBookmarksOpen}
        onNavigate={onNavigate}
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

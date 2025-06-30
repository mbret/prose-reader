import { Presence } from "@chakra-ui/react"
import { useCallback, useState } from "react"
import { AnnotationsDialog } from "./annotations/AnnotationsDialog"
import { BookmarkPageMarkers } from "./annotations/bookmarks/BookmarkPageMarkers"
import { useBookmarkOnCornerTap } from "./annotations/bookmarks/useBookmarkOnCornerTap"
import { Toaster } from "./components/ui/toaster"
import { GalleryDialog } from "./gallery/GalleryDialog"
import { HelpDialog } from "./help/HelpDialog"
import { FloatingProgress } from "./navigation/FloatingProgress"
import { FloatingTime } from "./navigation/FloatingTime"
import { useInterceptExternalLinks } from "./navigation/useInterceptExternalLinks"
import { useNotifications } from "./notifications/useNotifications"
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
      | "back"
      | "gallery",
  ) => void
}) => {
  const [isTableOfContentsOpen, setIsTableOfContentsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAnnotationsOpenWith, setIsAnnotationsOpenWith] = useState<
    "bookmarks" | "annotations" | undefined
  >(undefined)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [quickMenuOpen, setQuickMenuOpen] = useQuickMenu()

  const onNavigate = useCallback(() => {
    setIsTableOfContentsOpen(false)
    setIsHelpOpen(false)
    setIsSearchOpen(false)
    setIsAnnotationsOpenWith(undefined)
    setQuickMenuOpen(false)
    setIsGalleryOpen(false)
  }, [setQuickMenuOpen])

  const _onItemClick: NonNullable<typeof onItemClick> = useCallback(
    (item) => {
      if (item === "annotations") {
        setIsAnnotationsOpenWith("annotations")
      } else if (item === "search") {
        setIsSearchOpen(true)
      } else if (item === "help") {
        setIsHelpOpen(true)
      } else if (item === "toc") {
        setIsTableOfContentsOpen(true)
      } else if (item === "bookmarks") {
        setIsAnnotationsOpenWith("bookmarks")
      } else if (item === "gallery") {
        setIsGalleryOpen(true)
      }
      onItemClick?.(item)
    },
    [onItemClick],
  )

  useInterceptExternalLinks()
  useNotifications()
  useBookmarkOnCornerTap()

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
      <GalleryDialog open={isGalleryOpen} setOpen={setIsGalleryOpen} />
      <QuickMenu onItemClick={_onItemClick} />
      <BookmarkPageMarkers />
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
        openWith={isAnnotationsOpenWith}
        setOpen={(open) =>
          setIsAnnotationsOpenWith(open ? "annotations" : undefined)
        }
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
      <Toaster />
    </>
  )
}

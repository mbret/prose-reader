import { Box, type BoxProps, Presence } from "@chakra-ui/react"
import { type ComponentProps, memo, useCallback, useState } from "react"
import { AnnotationsDialog } from "./annotations/AnnotationsDialog"
import { BookmarkPageMarkers } from "./annotations/bookmarks/BookmarkPageMarkers"
import { useBookmarkOnCornerTap } from "./annotations/bookmarks/useBookmarkOnCornerTap"
import { Toaster } from "./components/ui/toaster"
import { ReactReaderProvider } from "./context/ReactReaderProvider"
import { useReaderContextValue } from "./context/useReaderContext"
import { FontSizeControlsDialog } from "./fonts/FontSizeControlsDialog"
import { SyncFontSettings } from "./fonts/SyncFontSettings"
import { GalleryDialog } from "./gallery/GalleryDialog"
import { HelpDialog } from "./help/HelpDialog"
import { FloatingProgress } from "./navigation/FloatingProgress"
import { FloatingTime } from "./navigation/FloatingTime"
import { useInterceptExternalLinks } from "./navigation/useInterceptExternalLinks"
import { useNotifications } from "./notifications/useNotifications"
import { QuickMenu } from "./quickmenu/QuickMenu"
import { useQuickMenu } from "./quickmenu/useQuickMenu"
import { RefitDialog } from "./refit/RefitDialog"
import { SearchDialog } from "./search/SearchDialog"
import { TableOfContentsDialog } from "./toc/TableOfContentsDialog"
import { useZoomSettings } from "./zoom/useZoomSettings"
import { ZoomControls } from "./zoom/ZoomControls"

const ANIMATION_NAME_IN_OUT = { _open: "fade-in", _closed: "fade-out" }

const BookmarksEffects = memo(() => {
  // Intensive
  useBookmarkOnCornerTap()

  return null
})

const Effects = memo(() => {
  useZoomSettings()
  useInterceptExternalLinks()
  useNotifications()

  return (
    <>
      <SyncFontSettings />
      <BookmarksEffects />
    </>
  )
})

const InnerReactReader = memo(
  ({
    children,
    ...rest
  }: {
    children: React.ReactNode
  } & BoxProps) => {
    const { enableFloatingTime, enableFloatingProgress, onItemClick } =
      useReaderContextValue([
        "enableFloatingTime",
        "enableFloatingProgress",
        "onItemClick",
      ])
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

    return (
      <>
        <Effects />
        <Box
          position="absolute"
          top={0}
          left={0}
          height="100%"
          width="100%"
          overflow="hidden"
          data-prose-react-reader
          {...rest}
        >
          {children}
          {enableFloatingProgress && (
            <Presence
              present={!quickMenuOpen}
              animationName={ANIMATION_NAME_IN_OUT}
              animationDuration="moderate"
            >
              <FloatingProgress />
            </Presence>
          )}
          <GalleryDialog open={isGalleryOpen} setOpen={setIsGalleryOpen} />
          <RefitDialog />
          <QuickMenu onItemClick={_onItemClick} />
          <ZoomControls />
          <FontSizeControlsDialog />
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
            animationName={ANIMATION_NAME_IN_OUT}
            animationDuration="slow"
            overflow="hidden"
          >
            <FloatingTime />
          </Presence>
          <Toaster />
        </Box>
      </>
    )
  },
)

export const ReactReader = memo(
  ({
    children,
    slots,
    ...props
  }: ComponentProps<typeof ReactReaderProvider> & {
    slots?: {
      container?: {
        props?: Omit<ComponentProps<typeof InnerReactReader>, "children">
      }
    }
  }) => {
    const { container: { props: containerProps = {} } = {} } = slots ?? {}

    return (
      <ReactReaderProvider {...props}>
        <InnerReactReader {...containerProps}>{children}</InnerReactReader>
      </ReactReaderProvider>
    )
  },
)

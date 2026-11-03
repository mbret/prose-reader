import { Box, type BoxProps, Presence } from "@chakra-ui/react"
import {
  type ComponentProps,
  memo,
  type ReactNode,
  useCallback,
  useState,
} from "react"
import { AnnotateControls } from "./annotations/AnnotateControls"
import { AnnotationDrawer } from "./annotations/AnnotationDrawer"
import { AnnotationsDialog } from "./annotations/AnnotationsDialog"
import { BookmarkPageMarkers } from "./annotations/bookmarks/BookmarkPageMarkers"
import { useBookmarkOnCornerTap } from "./annotations/bookmarks/useBookmarkOnCornerTap"
import { usePreventInteractionOnSelection } from "./annotations/usePreventInteractionOnSelection"
import { useSyncAnnotationsWithReader } from "./annotations/useSyncAnnotationsWithReader"
import { Spine } from "./common/Spine"
import { Toaster } from "./components/ui/toaster"
import type { PublicContextType, ReactReaderReader } from "./context/context"
import { ReactReaderProvider } from "./context/ReactReaderProvider"
import { useReaderContextValue } from "./context/useReaderContext"
import { FontSizeControlsDialog } from "./fonts/FontSizeControlsDialog"
import { GalleryDialog } from "./gallery/GalleryDialog"
import { HelpDialog } from "./help/HelpDialog"
import { LayoutDialog } from "./layout/LayoutDialog"
import { FloatingProgress } from "./navigation/FloatingProgress"
import { FloatingTime } from "./navigation/FloatingTime"
import { SpreadRotationHint } from "./navigation/SpreadRotationHint"
import { useInterceptExternalLinks } from "./navigation/useInterceptExternalLinks"
import { useNotifications } from "./notifications/useNotifications"
import { QuickMenu } from "./quickmenu/QuickMenu"
import { useQuickMenu } from "./quickmenu/useQuickMenu"
import { useQuickMenuToggleGesture } from "./quickmenu/useQuickMenuToggleGesture"
import { ReaderMountPoint } from "./ReaderMountPoint"
import { RefitDialog } from "./refit/RefitDialog"
import { SearchDialog } from "./search/SearchDialog"
import { SyncReaderWithManagedSettings } from "./settings/SyncReaderWithManagedSettings"
import { ThemeDialog } from "./theme/ThemeDialog"
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
  useQuickMenuToggleGesture()
  usePreventInteractionOnSelection()
  useSyncAnnotationsWithReader()

  return (
    <>
      <SyncReaderWithManagedSettings />
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
    const { enableFloatingTime, onItemClick } = useReaderContextValue([
      "enableFloatingTime",
      "onItemClick",
    ])
    const [isTableOfContentsOpen, setIsTableOfContentsOpen] = useState(false)
    const [isHelpOpen, setIsHelpOpen] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [isAnnotationsOpenWith, setIsAnnotationsOpenWith] = useState<
      "bookmarks" | "annotations" | undefined
    >(undefined)
    const [isGalleryOpen, setIsGalleryOpen] = useState(false)
    const [isLayoutOpen, setIsLayoutOpen] = useState(false)
    const [isThemeOpen, setIsThemeOpen] = useState(false)
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
        } else if (item === "layout") {
          setIsLayoutOpen(true)
        } else if (item === "theme") {
          setIsThemeOpen(true)
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
          <Spine>
            <BookmarkPageMarkers />
          </Spine>
          <FloatingProgress />
          <SpreadRotationHint />
          <GalleryDialog open={isGalleryOpen} setOpen={setIsGalleryOpen} />
          <RefitDialog />
          <LayoutDialog open={isLayoutOpen} setOpen={setIsLayoutOpen} />
          <ThemeDialog open={isThemeOpen} setOpen={setIsThemeOpen} />
          <QuickMenu onItemClick={_onItemClick} />
          <ZoomControls />
          <AnnotateControls />
          <AnnotationDrawer />
          <FontSizeControlsDialog />
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
          >
            <FloatingTime />
          </Presence>
          <Toaster />
        </Box>
      </>
    )
  },
)

export type ReactReaderProps<
  TReader extends ReactReaderReader = ReactReaderReader,
> = PublicContextType & {
  /**
   * Creates the reader. `ReactReader` writes the settings it manages into it,
   * mounts it, and destroys it when it unmounts or when `createReader`
   * changes. Memoize it: a new function creates a new reader, so an inline
   * one creates a reader on every render. Return a new reader on each call:
   * it is called again when `ReactReader` shows after an `<Activity>` hid it.
   * Leave it `undefined` until a reader can be created.
   */
  createReader?: () => TReader
  /** The reader `ReactReader` created, then `undefined` once it destroyed it. */
  onReaderChange?: (reader: TReader | undefined) => void
  children?: ReactNode
  slots?: {
    container?: {
      props?: Omit<ComponentProps<typeof InnerReactReader>, "children">
    }
  }
}

export function ReactReader<TReader extends ReactReaderReader>({
  children,
  slots,
  createReader,
  onReaderChange,
  ...props
}: ReactReaderProps<TReader>) {
  const { container: { props: containerProps = {} } = {} } = slots ?? {}

  return (
    <ReactReaderProvider {...props}>
      <InnerReactReader {...containerProps}>
        <ReaderMountPoint
          createReader={createReader}
          onReaderChange={onReaderChange}
        />
        {children}
      </InnerReactReader>
    </ReactReaderProvider>
  )
}

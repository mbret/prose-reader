import { Box, type BoxProps, Presence } from "@chakra-ui/react"
import { isShallowEqual } from "@prose-reader/shared"
import {
  type ComponentProps,
  memo,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useState,
} from "react"
import { useMemoCompare } from "reactjrx"
import { AnnotateControls } from "./annotations/AnnotateControls"
import { AnnotationDrawer } from "./annotations/AnnotationDrawer"
import { AnnotationsDialog } from "./annotations/AnnotationsDialog"
import { BookmarkPageMarkers } from "./annotations/bookmarks/BookmarkPageMarkers"
import { useBookmarkOnCornerTap } from "./annotations/bookmarks/useBookmarkOnCornerTap"
import { usePreventInteractionOnSelection } from "./annotations/usePreventInteractionOnSelection"
import { Spine } from "./common/Spine"
import { Toaster } from "./components/ui/toaster"
import type {
  EveryKeyOf,
  ViewContextType,
  ViewStateContextType,
} from "./context/context"
import {
  useReaderContext,
  useReaderContextValue,
} from "./context/useReaderContext"
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
import { ReaderElement } from "./ReaderElement"
import { RefitDialog } from "./refit/RefitDialog"
import { SearchDialog } from "./search/SearchDialog"
import { ThemeDialog } from "./theme/ThemeDialog"
import { TableOfContentsDialog } from "./toc/TableOfContentsDialog"
import { ZoomControls } from "./zoom/ZoomControls"

const ANIMATION_NAME_IN_OUT = { _open: "fade-in", _closed: "fade-out" }

const BookmarksEffects = memo(() => {
  // Intensive
  useBookmarkOnCornerTap()

  return null
})

const Effects = memo(() => {
  useInterceptExternalLinks()
  useNotifications()
  useQuickMenuToggleGesture()
  usePreventInteractionOnSelection()

  return <BookmarksEffects />
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

export type ReactReaderProps = ViewContextType & {
  /**
   * Renders after the element of the reader. Position it absolutely to show
   * it over the book.
   */
  children?: ReactNode
  slots?: {
    container?: {
      props?: Omit<ComponentProps<typeof InnerReactReader>, "children">
    }
  }
}

/**
 * Shows the reader of the `ReactReaderProvider` above, with react-reader's
 * menus. Hiding it, in an `<Activity>` for example, keeps the reader.
 */
export const ReactReader = memo(function ReactReader({
  children,
  slots,
  enableFloatingTime,
  enableFloatingProgress = true,
  onItemClick,
  quickMenuOpen,
  onQuickMenuOpenChange,
}: ReactReaderProps) {
  const context = useReaderContext()
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false)
  const [isFontSizeMenuOpen, setIsFontSizeMenuOpen] = useState(false)
  const [isRefitMenuOpen, setIsRefitMenuOpen] = useState(false)
  const viewProps = useMemoCompare<
    EveryKeyOf<ViewContextType> & ViewStateContextType
  >(
    {
      enableFloatingTime,
      enableFloatingProgress,
      onItemClick,
      quickMenuOpen,
      onQuickMenuOpenChange,
      _quickMenuOpen: isQuickMenuOpen,
      _onQuickMenuOpenChange: setIsQuickMenuOpen,
      fontSizeMenuOpen: isFontSizeMenuOpen,
      onFontSizeMenuOpenChange: setIsFontSizeMenuOpen,
      refitMenuOpen: isRefitMenuOpen,
      onRefitMenuOpenChange: setIsRefitMenuOpen,
    },
    isShallowEqual,
  )
  const { container: { props: containerProps = {} } = {} } = slots ?? {}

  useLayoutEffect(
    function copyPropsIntoContext() {
      context.update((old) => ({ ...old, ...viewProps }))
    },
    [context, viewProps],
  )

  return (
    <InnerReactReader {...containerProps}>
      <ReaderElement />
      {children}
    </InnerReactReader>
  )
})

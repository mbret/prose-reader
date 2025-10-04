import { Box } from "@chakra-ui/react"
import { ReactReader, ReactReaderProvider } from "@prose-reader/react-reader"
import {
  type ComponentProps,
  memo,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { useNavigate, useParams } from "react-router"
import { useObserve, useSignalValue } from "reactjrx"
import { HighlightMenu } from "./annotations/HighlightMenu"
import { useAnnotations } from "./annotations/useAnnotations"
import { BookError } from "./BookError"
import { BookLoading } from "./BookLoading"
import { useGestureHandler } from "./gestures/useGestureHandler"
import { isMenuOpenSignal, MenuDialog } from "./navigation/MenuDialog"
import { QuickActionsMenu } from "./navigation/QuickActionsMenu"
import { useSettings } from "./settings/useSettings"
import { useUpdateReaderSettings } from "./settings/useUpdateReaderSettings"
import { isQuickMenuOpenSignal, useResetStateOnUnMount } from "./states"
import { useCreateReader } from "./useCreateReader"
import { useManifest } from "./useManifest"
import { usePersistCurrentPagination } from "./usePersistCurrentPage"
import { useReader } from "./useReader"

export const ReaderScreen = memo(() => {
  const { url = `` } = useParams<`url`>()
  const { reader } = useReader()
  const { data: manifest, error: manifestError } = useManifest(url)
  const readerContainerRef = useRef<HTMLDivElement | null>(null)
  const [localSettings, setLocalSettings] = useSettings()
  const bookState = useObserve(() => reader?.state$, [reader])
  const isQuickMenuOpen = useSignalValue(isQuickMenuOpenSignal)
  const navigate = useNavigate()

  useCreateReader()
  useGestureHandler()
  useUpdateReaderSettings({ localSettings })
  useAnnotations(reader, url)
  usePersistCurrentPagination()
  useResetStateOnUnMount()

  useEffect(() => {
    console.debug(`manifest`, manifest)

    const containerElement = readerContainerRef.current

    if (reader && manifest && containerElement) {
      reader?.load({
        containerElement,
        manifest,
        cfi: localStorage.getItem(`cfi`) || undefined,
      })
    }
  }, [manifest, reader])

  const onItemClick = useCallback(
    (
      item: Parameters<
        NonNullable<ComponentProps<typeof ReactReader>["onItemClick"]>
      >[0],
    ) => {
      if (item === "more") {
        isMenuOpenSignal.next(true)
      }
      if (item === "back") {
        if (window.history.state === null && window.location.pathname !== `/`) {
          navigate(`/`)
        } else {
          navigate(-1)
        }
      }
    },
    [navigate],
  )

  return (
    <>
      {/* not wrapping the reader within for now since hot reload break the reader container */}
      <ReactReaderProvider
        reader={reader}
        quickMenuOpen={isQuickMenuOpen}
        onQuickMenuOpenChange={(isOpen) => isQuickMenuOpenSignal.next(isOpen)}
        fontSize={localSettings.fontSize}
        onFontSizeChange={(_scope, fontSize) =>
          setLocalSettings((old) => ({ ...old, fontSize }))
        }
      >
        <ReactReader
          height="100%"
          width="100%"
          position="relative"
          onItemClick={onItemClick}
        >
          <Box width="100%" height="100%" ref={readerContainerRef} />
          {!!manifestError && <BookError url={url} />}
          {bookState !== "ready" && !manifestError && <BookLoading />}
          <QuickActionsMenu />
          <MenuDialog
            localSettings={localSettings}
            setLocalSettings={setLocalSettings}
          />
          <HighlightMenu />
        </ReactReader>
      </ReactReaderProvider>
    </>
  )
})

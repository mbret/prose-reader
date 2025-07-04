import { Box } from "@chakra-ui/react"
import { ReactReader, ReactReaderProvider } from "@prose-reader/react-reader"
import { memo, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router"
import { useObserve, useSignalValue } from "reactjrx"
import { BookError } from "./BookError"
import { BookLoading } from "./BookLoading"
import { HighlightMenu } from "./annotations/HighlightMenu"
import { useAnnotations } from "./annotations/useAnnotations"
import { useGestureHandler } from "./gestures/useGestureHandler"
import { MenuDialog, isMenuOpenSignal } from "./navigation/MenuDialog"
import { QuickActionsMenu } from "./navigation/QuickActionsMenu"
import { useLocalSettings } from "./settings/useLocalSettings"
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
  const [localSettings, setLocalSettings] = useLocalSettings()
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

  return (
    <>
      <Box height="100%" width="100%" position="relative">
        <Box width="100%" height="100%" ref={readerContainerRef} />
        {!!manifestError && <BookError url={url} />}
        {bookState !== "ready" && !manifestError && <BookLoading />}
      </Box>
      {/* not wrapping the reader within for now since hot reload break the reader container */}
      <ReactReaderProvider
        reader={reader}
        quickMenuOpen={isQuickMenuOpen}
        onQuickMenuOpenChange={(isOpen) =>
          isQuickMenuOpenSignal.setValue(isOpen)
        }
      >
        <QuickActionsMenu />
        <ReactReader
          onItemClick={(item) => {
            if (item === "more") {
              isMenuOpenSignal.setValue(true)
            }
            if (item === "back") {
              if (
                window.history.state === null &&
                window.location.pathname !== `/`
              ) {
                navigate(`/`)
              } else {
                navigate(-1)
              }
            }
          }}
        />
        <MenuDialog
          localSettings={localSettings}
          setLocalSettings={setLocalSettings}
        />
        <HighlightMenu />
      </ReactReaderProvider>
    </>
  )
})

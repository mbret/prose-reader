import { Box } from "@chakra-ui/react"
import { ReactReader, useReader } from "@prose-reader/react-reader"
import "@prose-reader/react-reader/index.css"
import {
  type ComponentProps,
  memo,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { useLocation, useNavigate, useParams } from "react-router"
import { signal, useObserve, useSignalState, useSignalValue } from "reactjrx"
import { useDocumentTitle } from "../useDocumentTitle"
import { useServiceWorkerReady } from "../useServiceWorkerReady"
import { restoreAnnotations, usePersistAnnotations } from "./annotations"
import { BookError } from "./BookError"
import { BookLoading } from "./BookLoading"
import { isMenuOpenSignal, MenuDialog } from "./navigation/MenuDialog"
import { useBookBoundariesReachedToast } from "./navigation/useBookBoundariesReachedToast"
import { useBookSettings } from "./settings/useBookSettings"
import { useReactReaderSettingsProps } from "./settings/useReactReaderSettingsProps"
import { useSettings } from "./settings/useSettings"
import { useUpdateReaderSettings } from "./settings/useUpdateReaderSettings"
import { isQuickMenuOpenSignal, useResetStateOnUnMount } from "./states"
import { isClientStreamedBook } from "./streaming"
import { useCreateReader } from "./useCreateReader"
import { useManifest } from "./useManifest"
import { usePersistReadingPosition } from "./usePersistReadingPosition"

const ReaderScreenView = memo(function ReaderScreenView({
  epubKey,
  hasManifestError,
}: {
  epubKey: string
  hasManifestError: boolean
}) {
  const reader = useReader()
  const serviceWorkerReady = useServiceWorkerReady()
  const waitingForServiceWorker =
    !isClientStreamedBook(epubKey) && !serviceWorkerReady
  const [localSettings, setLocalSettings] = useSettings()
  const { data: isReaderMounted } = useObserve(() => reader?.mounted$, [reader])

  useUpdateReaderSettings({ localSettings })
  usePersistReadingPosition(epubKey)
  useBookBoundariesReachedToast()

  useEffect(
    function exposeReaderForDebugging() {
      // @ts-expect-error expose the reader in the console for debugging
      window.reader = reader
    },
    [reader],
  )

  return (
    <>
      {hasManifestError && <BookError url={epubKey} />}
      {!isReaderMounted && !hasManifestError && (
        <BookLoading waitingForServiceWorker={waitingForServiceWorker} />
      )}
      <MenuDialog
        localSettings={localSettings}
        setLocalSettings={setLocalSettings}
      />
    </>
  )
})

export const ReaderScreen = memo(() => {
  const { url = `` } = useParams<`url`>()
  const epubKey = url
  const { data: manifest, error: manifestError } = useManifest(epubKey)
  const readerContainerRef = useRef<HTMLDivElement | null>(null)
  const [annotations, annotationsSignal] = useSignalState(() =>
    signal({
      default: restoreAnnotations(epubKey),
    }),
  )
  const [_, __, bookSettingsSignal] = useBookSettings(epubKey)
  const reader = useCreateReader(manifest, readerContainerRef, epubKey)
  const isQuickMenuOpen = useSignalValue(isQuickMenuOpenSignal)
  const navigate = useNavigate()
  const { key: locationKey } = useLocation()

  useDocumentTitle(manifest?.title ?? `Reader - prose reader demo`)
  useResetStateOnUnMount()
  usePersistAnnotations(annotationsSignal, epubKey)

  const reactReaderSettingsProps =
    useReactReaderSettingsProps(bookSettingsSignal)

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
        /**
         * `default` is the key react-router gives an entry it did not create
         * itself, which means the reader was opened directly (a shared link,
         * a reload) and there is no in-app history to go back to.
         */
        if (locationKey === "default") {
          navigate("/")
        } else {
          navigate(-1)
        }
      }
    },
    [navigate, locationKey],
  )

  return (
    <>
      {/* React hoists it into the head: the books the demo opens stay out of search results */}
      <meta name="robots" content="noindex" />
      {/* not wrapping the reader within for now since hot reload break the reader container */}
      <ReactReader
        onItemClick={onItemClick}
        reader={reader}
        quickMenuOpen={isQuickMenuOpen}
        onQuickMenuOpenChange={isQuickMenuOpenSignal.update}
        {...reactReaderSettingsProps}
        slots={{
          container: {
            props: {
              height: "100%",
              width: "100%",
              position: "relative",
            },
          },
        }}
        annotations={annotations}
        onAnnotationCreate={(annotation) => {
          annotationsSignal.update([...annotations, annotation])
        }}
        onAnnotationUpdate={(annotation) => {
          annotationsSignal.update((state) =>
            state.map((a) =>
              a.id === annotation.id ? { ...a, ...annotation } : a,
            ),
          )
        }}
        onAnnotationDelete={(id) => {
          annotationsSignal.update((state) => state.filter((a) => a.id !== id))
        }}
      >
        <Box width="100%" height="100%" ref={readerContainerRef} />
        <ReaderScreenView
          epubKey={epubKey}
          hasManifestError={!!manifestError}
        />
      </ReactReader>
    </>
  )
})

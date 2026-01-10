import { Box, useBreakpointValue } from "@chakra-ui/react"
import { ReactReader } from "@prose-reader/react-reader"
import {
  type ComponentProps,
  memo,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { useNavigate, useParams } from "react-router"
import { signal, useObserve, useSignalState, useSignalValue } from "reactjrx"
import { restoreAnnotations, usePersistAnnotations } from "./annotations"
import { BookError } from "./BookError"
import { BookLoading } from "./BookLoading"
import { isMenuOpenSignal, MenuDialog } from "./navigation/MenuDialog"
import { useBookSettings } from "./settings/useBookSettings"
import { useFontSizeSettings } from "./settings/useFontSizeSettings"
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
  const epubKey = url
  const { data: manifest, error: manifestError } = useManifest(epubKey)
  const readerContainerRef = useRef<HTMLDivElement | null>(null)
  const [localSettings, setLocalSettings] = useSettings()
  const [annotations, annotationsSignal] = useSignalState(() =>
    signal({
      default: restoreAnnotations(epubKey),
    }),
  )
  const [_, __, bookSettingsSignal] = useBookSettings(epubKey)
  const bookState = useObserve(() => reader?.state$, [reader])
  const isQuickMenuOpen = useSignalValue(isQuickMenuOpenSignal)
  const navigate = useNavigate()
  const breakpointValue = useBreakpointValue<"mobile" | "tablet" | "desktop">({
    base: "mobile",
    md: "tablet",
    lg: "desktop",
  })

  useCreateReader()
  useUpdateReaderSettings({ localSettings })
  usePersistCurrentPagination()
  useResetStateOnUnMount()
  usePersistAnnotations(annotationsSignal, epubKey)

  const {
    fontSizeScopeReference,
    fontSizeValue,
    onFontSizeChange,
    onFontSizeScopeChange,
    fontSizeValues,
  } = useFontSizeSettings(bookSettingsSignal, breakpointValue)

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
      <ReactReader
        onItemClick={onItemClick}
        reader={reader}
        quickMenuOpen={isQuickMenuOpen}
        onQuickMenuOpenChange={isQuickMenuOpenSignal.update}
        fontSize={fontSizeValue}
        onFontSizeChange={onFontSizeChange}
        fontSizeValues={fontSizeValues}
        onFontSizeScopeChange={onFontSizeScopeChange}
        fontSizeScope={fontSizeScopeReference}
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
        {!!manifestError && <BookError url={url} />}
        {bookState !== "ready" && !manifestError && <BookLoading />}
        <MenuDialog
          localSettings={localSettings}
          setLocalSettings={setLocalSettings}
        />
      </ReactReader>
    </>
  )
})

import React, { ComponentProps, useCallback, useState } from "react"
import { useEffect } from "react"
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil"
import { useGestureHandler } from "./useGestureHandler"
import { Reader as ReactReader } from "@prose-reader/react"
import { QuickMenu } from "../QuickMenu"
import { bookReadyState, isMenuOpenState, manifestState, paginationState, useResetStateOnUnMount } from "../state"
import { ComicsSettings } from "./ComicsSettings"
import { Loading } from "../Loading"
import { useBookmarks } from "../useBookmarks"
import { useParams } from "react-router"
import { BookError } from "../BookError"
import { getEpubUrlFromLocation } from "../serviceWorker/utils"
import { HighlightMenu } from "../HighlightMenu"
import { bookmarksEnhancer } from "@prose-reader/enhancer-bookmarks"
import { ZoomingIndicator } from "../common/ZoomingIndicator"
import { composeEnhancer, Manifest } from "@prose-reader/core"
import { hammerGestureEnhancer } from "@prose-reader/enhancer-hammer-gesture"
import { ReactReaderProps, ReaderInstance } from "../types"
import { useReaderValue } from "../useReader"
import { useReaderSettings } from "../common/useReaderSettings"

const readerEnhancer = composeEnhancer(hammerGestureEnhancer, bookmarksEnhancer)

export const Reader = ({
  onReader,
  manifest,
  manifestError
}: {
  onReader: (instance: ReaderInstance | undefined) => void
  manifest?: Manifest | undefined
  manifestError?: unknown
}) => {
  const { url = `` } = useParams<`url`>()
  const query = new URLSearchParams(window.location.search)
  const { computedPageTurnMode } = useReaderSettings() ?? {}
  const isUsingFreeScroll = computedPageTurnMode === `scrollable`
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const reader = useReaderValue()
  const setManifestState = useSetRecoilState(manifestState)
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined)
  const setPaginationState = useSetRecoilState(paginationState)
  const [bookReady, setBookReady] = useRecoilState(bookReadyState)
  const isMenuOpen = useRecoilValue(isMenuOpenState)
  const [readerOptions, setReaderOptions] = useState<ReactReaderProps["options"] | undefined>(undefined)
  const [readerLoadOptions, setReaderLoadOptions] = useState<ReactReaderProps["loadOptions"]>(undefined)

  useBookmarks(reader, url)
  const hammerManager = useGestureHandler(container, isUsingFreeScroll)

  useEffect(() => {
    if (hammerManager) {
      setReaderOptions({
        pageTurnAnimation: `slide`,
        pageTurnDirection: query.has("vertical") ? `vertical` : `horizontal`,
        pageTurnMode: query.has("free") ? `scrollable` : `controlled`,
        layoutAutoResize: `container`,
        hammerManager,
        // cover portrait and spread mode without blank page
        numberOfAdjacentSpineItemToPreLoad: 2
      })
    }
  }, [hammerManager])

  const onPaginationChange: ComponentProps<typeof ReactReader>["onPaginationChange"] = (info) => {
    localStorage.setItem(`cfi`, info?.beginCfi || ``)
    setPaginationState(info)
  }

  const onReady = useCallback(() => {
    setBookReady(true)
  }, [setBookReady])

  useEffect(() => {
    if (!reader || !manifest) return

    setManifestState(manifest)
  }, [setManifestState, reader, manifest])

  useEffect(() => {
    if (manifest) {
      setReaderLoadOptions({
        cfi: localStorage.getItem(`cfi`) || undefined
      })
    }
  }, [manifest, setReaderLoadOptions])

  useEffect(
    () => () => {
      onReader(undefined)
    },
    [onReader]
  )

  useResetStateOnUnMount()

  // @ts-ignore
  window.reader = reader

  return (
    <>
      <div
        style={{
          height: `100%`,
          width: `100%`
        }}
        ref={(ref) => {
          if (ref) {
            setContainer(ref)
          }
        }}
      >
        {!!readerLoadOptions && !!readerOptions && (
          <ReactReader
            manifest={manifest}
            onReader={onReader}
            onReady={onReady}
            loadOptions={readerLoadOptions}
            onPaginationChange={onPaginationChange}
            options={readerOptions}
            enhancer={readerEnhancer}
          />
        )}
        {!!manifestError && <BookError url={getEpubUrlFromLocation(url)} />}
        {!bookReady && !manifestError && <Loading />}
      </div>
      <HighlightMenu />
      <QuickMenu open={isMenuOpen} onSettingsClick={() => setIsSettingsOpen(true)} isComics />
      <ZoomingIndicator />
      {reader && <ComicsSettings reader={reader} open={isSettingsOpen} onExit={() => setIsSettingsOpen(false)} />}
    </>
  )
}

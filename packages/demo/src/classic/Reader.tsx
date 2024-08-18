import React, { useCallback, useState } from "react"
import { useEffect } from "react"
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil"
import { Reader as ReactReader } from "@prose-reader/react"
import { Manifest } from "@prose-reader/core"
import { QuickMenu } from "../reader/QuickMenu"
import { bookReadyState, isHelpOpenState, isMenuOpenState, isSearchOpenState, useResetStateOnUnMount } from "../state"
import { SettingsDialog } from "../reader/settings/SettingsDialog"
import { Loading } from "../reader/Loading"
import { createAppReader, ReactReaderProps, ReaderInstance } from "../types"
import { useBookmarks } from "../reader/bookmarks/useBookmarks"
import { useParams } from "react-router"
import { BookError } from "../reader/BookError"
import { getEpubUrlFromLocation } from "../serviceWorker/utils"
import { HighlightMenu } from "../reader/HighlightMenu"
import { SearchDialog } from "../reader/SearchDialog"
import { HelpDialog } from "../reader/HelpDialog"
import { useReader } from "../reader/useReader"
import { FONT_SCALE_MAX, FONT_SCALE_MIN } from "../constants.shared"
import { useGestureHandler } from "../reader/gestures/useGestureHandler"
import { useLocalSettings } from "../reader/settings/useLocalSettings"
import { useReaderOptions } from "../reader/settings/useReaderOptions"

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
  const { reader } = useReader()
  const [localSettings, setLocalSettings] = useLocalSettings({
    enablePan: true
  })
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined)
  const [bookReady, setBookReady] = useRecoilState(bookReadyState)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const isMenuOpen = useRecoilValue(isMenuOpenState)
  const [isSearchOpen, setIsSearchOpen] = useRecoilState(isSearchOpenState)
  const [isHelpOpen, setIsHelpOpen] = useRecoilState(isHelpOpenState)
  const {readerOptions} = useReaderOptions()
  const [readerLoadOptions, setReaderLoadOptions] = useState<ReactReaderProps["loadOptions"]>()

  useBookmarks(reader, url)
  useGestureHandler()

  const onReady = useCallback(() => {
    setBookReady(true)
  }, [setBookReady])

  const onClassicSettingsExit = useCallback(() => setIsSettingsOpen(false), [])

  useEffect(() => {
    const linksSubscription = reader?.$.links$.subscribe((data) => {
      if (data.event === "linkClicked") {
        if (!data.data.href) return
        const url = new URL(data.data.href)
        if (window.location.host !== url.host) {
          const response = confirm(`You are going to be redirected to external link`)
          if (response) {
            window.open(data.data.href, "__blank")
          }
        }
      }
    })

    return () => {
      linksSubscription?.unsubscribe()
    }
  }, [reader])

  useEffect(() => {
    if (manifest) {
      setReaderLoadOptions({
        cfi: localStorage.getItem(`cfi`) || undefined
      })
    }
  }, [manifest, setReaderLoadOptions])

  useEffect(() => {
    if (!reader) return

    return () => {
      reader.destroy()

      onReader(undefined)
    }
  }, [reader, onReader])

  useResetStateOnUnMount()

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
        {readerLoadOptions && (
          <ReactReader
            manifest={manifest}
            onReader={onReader}
            onReady={onReady}
            loadOptions={readerLoadOptions}
            options={readerOptions}
            createReader={createAppReader}
          />
        )}
        {!!manifestError && <BookError url={getEpubUrlFromLocation(url)} />}
        {!bookReady && !manifestError && <Loading />}
      </div>
      <HighlightMenu />
      <QuickMenu open={isMenuOpen} onSettingsClick={() => setIsSettingsOpen(true)} />
      {reader && (
        <SettingsDialog
          localSettings={localSettings}
          setLocalSettings={setLocalSettings}
          open={isSettingsOpen}
          onExit={onClassicSettingsExit}
        />
      )}
      <SearchDialog isOpen={isSearchOpen} onExit={() => setIsSearchOpen(false)} />
      <HelpDialog isOpen={isHelpOpen} onExit={() => setIsHelpOpen(false)} />
    </>
  )
}

import React, { memo, useEffect, useRef, useState } from "react"
import { useManifest } from "./useManifest"
import { useParams } from "react-router-dom"
import { TocDialog } from "./TocDialog"
import { useRecoilState, useRecoilValue } from "recoil"
import { isHelpOpenState, isMenuOpenState, isSearchOpenState, isTocOpenState, useResetStateOnUnMount } from "../state"
import { HighlightMenu } from "./HighlightMenu"
import { Bookmarks } from "./bookmarks/Bookmarks"
import { Notification } from "./Notification"
import { useCreateReader } from "./useCreateReader"
import { useGestureHandler } from "./gestures/useGestureHandler"
import { Box } from "@chakra-ui/react"
import { BookError } from "./BookError"
import { BookLoading } from "./BookLoading"
import { getEpubUrlFromLocation } from "../serviceWorker/utils"
import { useReader } from "./useReader"
import { useUpdateReaderSettings } from "./settings/useUpdateReaderSettings"
import { useLocalSettings } from "./settings/useLocalSettings"
import { useBookmarks } from "./bookmarks/useBookmarks"
import { QuickMenu } from "./QuickMenu"
import { SettingsDialog } from "./settings/SettingsDialog"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { SearchDialog } from "./SearchDialog"
import { HelpDialog } from "./HelpDialog"
import { useLinks } from "./useLinks"

export const Reader = memo(() => {
  const { url = `` } = useParams<`url`>()
  const { reader } = useReader()
  const { data: manifest, error: manifestError } = useManifest(url)
  const [isTocOpen, setIsTocOpen] = useRecoilState(isTocOpenState)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const readerContainerRef = useRef<HTMLDivElement | null>(null)
  const [localSettings, setLocalSettings] = useLocalSettings({
    enablePan: true
  })
  const [isSearchOpen, setIsSearchOpen] = useRecoilState(isSearchOpenState)
  const [isHelpOpen, setIsHelpOpen] = useRecoilState(isHelpOpenState)
  const isMenuOpen = useRecoilValue(isMenuOpenState)
  const bookState = useObserve(() => reader?.state$ ?? NEVER, [reader])

  useCreateReader()

  useGestureHandler()
  useUpdateReaderSettings({ localSettings, manifest })
  useBookmarks(reader, url)
  useLinks()

  useResetStateOnUnMount()

  useEffect(() => {
    const containerElement = readerContainerRef.current

    if (reader && manifest && containerElement) {
      reader?.load({
        containerElement,
        manifest,
        cfi: localStorage.getItem(`cfi`) || undefined
      })
    }
  }, [manifest, reader])

  return (
    <>
      <Box height="100%" width="100%">
        <Box width="100%" height="100%" ref={readerContainerRef} />
        {!!manifestError && <BookError url={getEpubUrlFromLocation(url)} />}
        {bookState !== "ready" && !manifestError && <BookLoading />}
      </Box>
      <QuickMenu open={isMenuOpen} onSettingsClick={() => setIsSettingsOpen(true)} />
      <SettingsDialog
        setLocalSettings={setLocalSettings}
        localSettings={localSettings}
        open={isSettingsOpen}
        onExit={() => setIsSettingsOpen(false)}
      />
      <TocDialog isOpen={isTocOpen} onExit={() => setIsTocOpen(false)} />
      <SearchDialog isOpen={isSearchOpen} onExit={() => setIsSearchOpen(false)} />
      <HelpDialog isOpen={isHelpOpen} onExit={() => setIsHelpOpen(false)} />
      <HighlightMenu />
      <Bookmarks />
      <Notification />
    </>
  )
})

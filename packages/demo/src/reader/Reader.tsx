import React, { memo, useEffect, useRef } from "react"
import { useManifest } from "./useManifest"
import { useParams } from "react-router-dom"
import { useResetStateOnUnMount } from "./states"
import { HighlightMenu } from "./highlights/HighlightMenu"
import { Bookmarks } from "./bookmarks/Bookmarks"
import { Notification } from "./notifications/Notification"
import { useCreateReader } from "./useCreateReader"
import { useGestureHandler } from "./gestures/useGestureHandler"
import { Box } from "@chakra-ui/react"
import { BookError } from "./BookError"
import { BookLoading } from "./BookLoading"
import { useReader } from "./useReader"
import { useUpdateReaderSettings } from "./settings/useUpdateReaderSettings"
import { useLocalSettings } from "./settings/useLocalSettings"
import { useBookmarks } from "./bookmarks/useBookmarks"
import { QuickMenu } from "./navigation/QuickMenu"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { useLinks } from "./links/useLinks"
import { usePersistCurrentPagination } from "./usePersistCurrentPage"
import { Menu } from "./navigation/Menu"

export const Reader = memo(() => {
  const { url = `` } = useParams<`url`>()
  const { reader } = useReader()
  const { data: manifest, error: manifestError } = useManifest(url)
  const readerContainerRef = useRef<HTMLDivElement | null>(null)
  const [localSettings, setLocalSettings] = useLocalSettings({
    enablePan: true
  })
  const bookState = useObserve(() => reader?.state$ ?? NEVER, [reader])

  useCreateReader()

  useGestureHandler()
  useUpdateReaderSettings({ localSettings, manifest })
  useBookmarks(reader, url)
  useLinks()
  usePersistCurrentPagination()

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
        {!!manifestError && <BookError url={url} />}
        {bookState !== "ready" && !manifestError && <BookLoading />}
      </Box>
      <QuickMenu />
      <Menu localSettings={localSettings} setLocalSettings={setLocalSettings} />
      <HighlightMenu />
      <Bookmarks />
      <Notification />
    </>
  )
})

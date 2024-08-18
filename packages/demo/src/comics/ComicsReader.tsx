import React, { useCallback, useState } from "react"
import { useEffect } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import { Reader as ReactReader } from "@prose-reader/react"
import { QuickMenu } from "../reader/QuickMenu"
import { bookReadyState, isMenuOpenState, useResetStateOnUnMount } from "../state"
import { Loading } from "../reader/Loading"
import { useBookmarks } from "../reader/bookmarks/useBookmarks"
import { useParams } from "react-router"
import { BookError } from "../reader/BookError"
import { getEpubUrlFromLocation } from "../serviceWorker/utils"
import { Manifest } from "@prose-reader/core"
import { createAppReader, ReactReaderProps, ReaderInstance } from "../types"
import { useReader } from "../reader/useReader"
import { useGestureHandler } from "../reader/gestures/useGestureHandler"
import { Box } from "@chakra-ui/react"
import { SettingsDialog } from "../reader/settings/SettingsDialog"
import { useLocalSettings } from "../reader/settings/useLocalSettings"
import { useUpdateReaderSettings } from "../reader/settings/useUpdateReaderSettings"
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
  const query = new URLSearchParams(window.location.search)
  const [localSettings, setLocalSettings] = useLocalSettings({
    enablePan: true
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { reader } = useReader()
  const [bookReady, setBookReady] = useRecoilState(bookReadyState)
  const isMenuOpen = useRecoilValue(isMenuOpenState)
  const {readerOptions} = useReaderOptions()
  const [readerLoadOptions, setReaderLoadOptions] = useState<ReactReaderProps["loadOptions"]>(undefined)

  useBookmarks(reader, url)
  useGestureHandler()
  useUpdateReaderSettings(localSettings)

  const onReady = useCallback(() => {
    setBookReady(true)
  }, [setBookReady])

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

  return (
    <>
      <Box height="100%" width="100%">
        {!!readerLoadOptions && (
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
      </Box>
      <QuickMenu open={isMenuOpen} onSettingsClick={() => setIsSettingsOpen(true)} />
      <SettingsDialog
        setLocalSettings={setLocalSettings}
        localSettings={localSettings}
        open={isSettingsOpen}
        onExit={() => setIsSettingsOpen(false)}
      />
    </>
  )
}

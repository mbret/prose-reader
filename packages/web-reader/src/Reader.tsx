import React, { useState } from 'react';
import { useEffect } from "react"
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { createGestureHandler } from "./gesture";
import { Reader as ReactReader } from "@oboku/reader-react";
import { composeEnhancer } from "@oboku/reader";
import { QuickMenu } from './QuickMenu';
import { bookReadyState, isComicState, manifestState, paginationState } from './state';
import { FontsSettings, fontsSettingsState } from './FontsSettings'
import { Loading } from './Loading';
import { Manifest, ReaderInstance } from './types';
import { useBookmarks } from './useBookmarks';
import { useReader } from './ReaderProvider';

export const Reader = ({ onReader }: { onReader: (instance: ReaderInstance) => void }) => {
  const fontsSettings = useRecoilValue(fontsSettingsState)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const reader = useReader()
  const [gestureHandler, setGestureHandler$] = useState<ReturnType<typeof createGestureHandler> | undefined>(undefined)
  const [manifest, setManifestState] = useRecoilState(manifestState)
  const isComic = useRecoilValue(isComicState)
  const setPaginationState = useSetRecoilState(paginationState)
  const [bookReady, setBookReady] = useRecoilState(bookReadyState)
  const bookmarksEnhancer = useBookmarks(reader)

  // compose final enhancer
  const readerEnhancer = bookmarksEnhancer ? composeEnhancer(bookmarksEnhancer) : undefined

  useEffect(() => {
    const subscription = gestureHandler?.$?.subscribe(({ event }) => {
      if (event === 'tap') {
        // if (reader?.magnifier.isActive()) return
        setIsMenuOpen(!isMenuOpen)
      }
    })

    return () => subscription?.unsubscribe()
  }, [gestureHandler, isMenuOpen])

  useEffect(() => {
    window.addEventListener(`resize`, () => {
      reader?.layout()
    })

    const readerSubscription$ = reader?.$.subscribe((data) => {
      if (data.type === 'ready') {
        setBookReady(true)
      }
    })

    const linksSubscription = reader?.links$.subscribe((data) => {
      if (data.event === 'linkClicked') {
        if (!data.data.href) return
        const url = new URL(data.data.href)
        if (window.location.host !== url.host) {
          const response = confirm(`You are going to be redirected to external link`)
          if (response) {
            window.open(data.data.href, '__blank')
          }
        }
      }
    })

    const paginationSubscription = reader?.pagination$.subscribe(data => {
      if (data.event === 'change') {
        localStorage.setItem(`cfi`, reader.getPaginationInfo()?.begin.cfi || ``)
        return setPaginationState(reader.getPaginationInfo())
      }
    })

    return () => {
      readerSubscription$?.unsubscribe()
      paginationSubscription?.unsubscribe()
      linksSubscription?.unsubscribe()
    }
  }, [reader, gestureHandler, setBookReady, setPaginationState])

  useEffect(() => {
    if (!reader) return

    (async () => {
      try {
        const bookManifest = await fetchManifest()

        // bookManifest.readingDirection = 'rtl'

        setManifestState(bookManifest)

        console.warn('MANIFEST', { bookManifest, cfi: localStorage.getItem(`cfi`) })
        // console.warn('MANIFEST', { bookManifest, cfi: `epubcfi(/2/4/20/16|[oboku~anchor~chapter1]|[oboku~offset~0])` })
        reader.load(bookManifest, {
          fetchResource: 'http',

          numberOfAdjacentSpineItemToPreLoad: 0,
        }, localStorage.getItem(`cfi`) || undefined)
        // })
        // }, `epubcfi(/2/4/2/2/2|[oboku~anchor~spi_ad]|[oboku~offset~0])`)
        // }, `epubcfi(/2/4/10/2|[oboku~anchor~chapter1]|[oboku~offset~0])`)
        // }, `epubcfi(/2/4/20/16|[oboku~anchor~chapter1]|[oboku~offset~0])`)
        // }, `epubcfi(/2/4/16/16|[oboku~anchor~chapter1]|[oboku~offset~0])`)
        // }, `epubcfi(/2/4/2/1|[oboku~anchor~chapter1]|[oboku~offset~9])`)
        // reader.load(bookManifest, `epubcfi(/0[oboku:id-id2629773])`)
        // reader.load(bookManifest, 3)
        // reader.load(bookManifest, `epubcfi(/2/4[oboku:Vol.04 Ch.0022.1 (gb) [Sense Scans]/004.jpg])`)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [setManifestState, reader])

  useEffect(() => {
    return () => reader?.destroy()
  }, [reader])

  const storedLineHeight = parseFloat(localStorage.getItem(`lineHeight`) || ``)

  // debug
  // @ts-ignore
  window.reader = reader

  return (
    <>
      <div
        style={{
          height: `100vh`,
          width: `100vw`,
        }}
        ref={ref => {
          if (ref && !gestureHandler && reader) {
            setGestureHandler$(createGestureHandler(ref, reader))
          }
        }}
      >
        {readerEnhancer && (
          <ReactReader
            manifest={manifest}
            onReader={onReader}
            options={{
              fontScale: parseFloat(localStorage.getItem(`fontScale`) || `1`),
              lineHeight: storedLineHeight || undefined,
              theme: `sepia`
            }}
            enhancer={readerEnhancer}
          />
        )}
        {!bookReady && (
          <Loading />
        )}
      </div>
      <QuickMenu
        open={isMenuOpen}
        onReadingItemChange={index => {
          reader?.goTo(index)
        }}
        onPageChange={pageIndex => {
          if (isComic) {
            reader?.goTo(pageIndex)
          } else {
            reader?.goToPageOfCurrentChapter(pageIndex)
          }
        }} />
      {fontsSettings && reader && <FontsSettings reader={reader} />}
    </>
  )
}

const fetchManifest = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const epubPath = urlParams.get(`epub`);

  const response = await fetch(`http://localhost:9000/reader/${epubPath}/manifest`)
  const bookManifest: Manifest = await response.json()

  return bookManifest
}
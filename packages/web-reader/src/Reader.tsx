import React, { useState } from 'react';
import { useEffect } from "react"
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useGestureHandler } from "./useGestureHandler";
import { Reader as ReactReader } from "@oboku/reader-react";
import { composeEnhancer } from "@oboku/reader";
import { QuickMenu } from './QuickMenu';
import { bookReadyState, isComicState, isMenuOpenState, manifestState, paginationState } from './state';
import { FontsSettings, fontsSettingsState } from './FontsSettings'
import { Loading } from './Loading';
import { ReaderInstance } from './types';
import { useBookmarks } from './useBookmarks';
import { useReader } from './ReaderProvider';
import { useManifest } from './useManifest';
import { useParams } from 'react-router';
import { BookError } from './BookError';
import { getEpubUrlFromLocation } from './serviceWorker/utils';

export const Reader = ({ onReader }: { onReader: (instance: ReaderInstance) => void }) => {
  const { url } = useParams<{ url: string }>();
  const fontsSettings = useRecoilValue(fontsSettingsState)
  const reader = useReader()
  const setManifestState = useSetRecoilState(manifestState)
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined)
  const isComic = useRecoilValue(isComicState)
  const setPaginationState = useSetRecoilState(paginationState)
  const [bookReady, setBookReady] = useRecoilState(bookReadyState)
  const bookmarksEnhancer = useBookmarks(reader)
  const isMenuOpen = useRecoilValue(isMenuOpenState)

  const { manifest, error: manifestError } = useManifest(url)

  useGestureHandler(container)

  // compose final enhancer
  const readerEnhancer = bookmarksEnhancer ? composeEnhancer(bookmarksEnhancer) : undefined

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
  }, [reader, setBookReady, setPaginationState])

  useEffect(() => {
    if (!reader || !manifest) return

    setManifestState(manifest)
  }, [setManifestState, reader, manifest])

  useEffect(() => {
    return () => reader?.destroy()
  }, [reader])

  useEffect(() => {
    return () => {
      setBookReady(false)
    }
  }, [setBookReady])

  const storedLineHeight = parseFloat(localStorage.getItem(`lineHeight`) || ``)

  // debug
  // @ts-ignore
  window.reader = reader

  return (
    <>
      <div
        style={{
          height: `100%`,
          width: `100%`,
        }}
        ref={ref => {
          if (ref) {
            setContainer(ref)
          }
        }}
      >
        {readerEnhancer && (
          <ReactReader
            manifest={manifest}
            onReader={onReader}
            loadOptions={{
              cfi: localStorage.getItem(`cfi`) || undefined,
              numberOfAdjacentSpineItemToPreLoad: manifest?.renditionLayout === 'pre-paginated' ? 1 : 0
            }}
            options={{
              fontScale: parseFloat(localStorage.getItem(`fontScale`) || `1`),
              lineHeight: storedLineHeight || undefined,
              theme: `sepia`,
            }}
            enhancer={readerEnhancer}
          />
        )}
        {manifestError && (
          <BookError url={getEpubUrlFromLocation(url)} />
        )}
        {!bookReady && !manifestError && (
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
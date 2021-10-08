import React, { ComponentProps, useCallback, useState } from 'react';
import { useEffect } from "react"
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useGestureHandler } from "./useGestureHandler";
import { Reader as ReactReader } from "@oboku/reader-react";
import { composeEnhancer } from "@oboku/reader";
import { QuickMenu } from '../QuickMenu';
import { bookReadyState, isMenuOpenState, isSearchOpenState, isTocOpenState, manifestState, paginationState, useResetStateOnUnMount } from '../state';
import { Settings, settingsState } from '../Settings'
import { Loading } from '../Loading';
import { ReaderInstance } from '../types';
import { useBookmarks } from '../useBookmarks';
import { useReader } from '../ReaderProvider';
import { useManifest } from '../useManifest';
import { useParams } from 'react-router';
import { BookError } from '../BookError';
import { getEpubUrlFromLocation } from '../serviceWorker/utils';
import { HighlightMenu } from '../HighlightMenu';
import { useHighlights } from '../useHighlights';
import { useSearch } from '../useSearch';
import { SearchDialog } from '../SearchDialog';
import { TocDialog } from '../TocDialog';

type ReactReaderProps = ComponentProps<typeof ReactReader>

export const Reader = ({ onReader }: { onReader: (instance: ReaderInstance | undefined) => void }) => {
  const { url } = useParams<{ url: string }>();
  const settings = useRecoilValue(settingsState)
  const reader = useReader()
  const setManifestState = useSetRecoilState(manifestState)
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined)
  const setPaginationState = useSetRecoilState(paginationState)
  const [bookReady, setBookReady] = useRecoilState(bookReadyState)
  const bookmarksEnhancer = useBookmarks(reader)
  const highlightsEnhancer = useHighlights(reader)
  const searchEnhancer = useSearch(reader)
  const isMenuOpen = useRecoilValue(isMenuOpenState)
  const storedLineHeight = parseFloat(localStorage.getItem(`lineHeight`) || ``)
  const [isSearchOpen, setIsSearchOpen] = useRecoilState(isSearchOpenState)
  const [isTocOpen, setIsTocOpen] = useRecoilState(isTocOpenState)
  const [readerOptions] = useState<ReactReaderProps['options']>({
    fontScale: parseFloat(localStorage.getItem(`fontScale`) || `1`),
    lineHeight: storedLineHeight || undefined,
    theme: undefined,
    pageTurnAnimation: `fade`
  })
  const [readerLoadOptions, setReaderLoadOptions] = useState<ReactReaderProps['loadOptions']>(undefined)
  const { manifest, error: manifestError } = useManifest(url)

  useGestureHandler(container)

  // compose final enhancer
  const readerEnhancer = bookmarksEnhancer && highlightsEnhancer ? composeEnhancer(highlightsEnhancer, bookmarksEnhancer, searchEnhancer) : undefined

  const onPaginationChange: ComponentProps<typeof ReactReader>['onPaginationChange'] = (info) => {
    localStorage.setItem(`cfi`, info?.begin.cfi || ``)
    setPaginationState(info)
  }

  const onReady = useCallback(() => {
    setBookReady(true)
  }, [setBookReady])

  useEffect(() => {
    window.addEventListener(`resize`, () => {
      reader?.layout()
    })

    const linksSubscription = reader?.$.links$.subscribe((data) => {
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

    return () => {
      linksSubscription?.unsubscribe()
    }
  }, [reader, setBookReady, setPaginationState])

  useEffect(() => {
    if (!reader || !manifest) return

    setManifestState(manifest)
  }, [setManifestState, reader, manifest])

  useEffect(() => {
    if (manifest) {
      setReaderLoadOptions({
        cfi: localStorage.getItem(`cfi`) || undefined,
        numberOfAdjacentSpineItemToPreLoad: 0
      })
    }
  }, [manifest, setReaderLoadOptions])

  useEffect(() => {
    return () => {
      reader?.destroy()
      if (reader) {
        onReader(undefined)
      }
    }
  }, [reader, onReader])

  useResetStateOnUnMount()

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
        {readerEnhancer && readerLoadOptions && (
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
        {manifestError && (
          <BookError url={getEpubUrlFromLocation(url)} />
        )}
        {!bookReady && !manifestError && (
          <Loading />
        )}
      </div>
      <HighlightMenu />
      <QuickMenu
        open={isMenuOpen}
        isComics={false}
      />
      {settings && reader && <Settings reader={reader} />}
      {isSearchOpen && <SearchDialog onExit={() => setIsSearchOpen(false)} />}
      {isTocOpen && <TocDialog onExit={() => setIsTocOpen(false)} />}
    </>
  )
}
import React, { ComponentProps, useCallback, useState } from 'react';
import { useEffect } from "react"
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useGestureHandler } from "./useGestureHandler";
import { Reader as ReactReader } from "@prose-reader/react";
import { composeEnhancer } from "@prose-reader/core";
import { QuickMenu } from '../QuickMenu';
import { bookReadyState, isMenuOpenState, manifestState, paginationState, readerSettingsState, useResetStateOnUnMount } from '../state';
import { ComicsSettings } from './ComicsSettings'
import { Loading } from '../Loading';
import { ReaderInstance } from './types';
import { useBookmarks } from '../useBookmarks';
import { useReader } from '../ReaderProvider';
import { useManifest } from '../useManifest';
import { useParams } from 'react-router';
import { BookError } from '../BookError';
import { getEpubUrlFromLocation } from '../serviceWorker/utils';
import { HighlightMenu } from '../HighlightMenu';

type ReactReaderProps = ComponentProps<typeof ReactReader>

export const Reader = ({ onReader }: { onReader: (instance: ReaderInstance | undefined) => void }) => {
  const { url = `` } = useParams<`url`>();
  const query = new URLSearchParams(window.location.search)
  const { computedPageTurnMode } = useRecoilValue(readerSettingsState) || {}
  const isUsingFreeScroll = computedPageTurnMode === `scrollable`
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const reader = useReader()
  const setManifestState = useSetRecoilState(manifestState)
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined)
  const setPaginationState = useSetRecoilState(paginationState)
  const [bookReady, setBookReady] = useRecoilState(bookReadyState)
  const bookmarksEnhancer = useBookmarks(reader)
  const isMenuOpen = useRecoilValue(isMenuOpenState)
  const [readerOptions] = useState<ReactReaderProps['options']>({
    pageTurnAnimation: `slide`,
    pageTurnDirection: query.has('vertical') ? `vertical` : `horizontal`,
    pageTurnMode: query.has('free') ? `scrollable` : `controlled`,
    layoutAutoResize: `container`
  })
  const [readerLoadOptions, setReaderLoadOptions] = useState<ReactReaderProps['loadOptions']>(undefined)
  const { manifest, error: manifestError } = useManifest(url)

  useGestureHandler(container, isUsingFreeScroll)

  // compose final enhancer
  const readerEnhancer = bookmarksEnhancer ? composeEnhancer(bookmarksEnhancer) : undefined

  const onPaginationChange: ComponentProps<typeof ReactReader>['onPaginationChange'] = (info) => {
    localStorage.setItem(`cfi`, info?.begin.cfi || ``)
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
        cfi: localStorage.getItem(`cfi`) || undefined,
        numberOfAdjacentSpineItemToPreLoad: 1
      })
    }
  }, [manifest, setReaderLoadOptions])

  useEffect(() => () => {
    onReader(undefined)
  }, [onReader])

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
        onSettingsClick={() => setIsSettingsOpen(true)}
        isComics
      />
      {reader && <ComicsSettings reader={reader} open={isSettingsOpen} onExit={() => setIsSettingsOpen(false)} />}
    </>
  )
}
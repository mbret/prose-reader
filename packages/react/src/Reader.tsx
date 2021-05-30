import React, { useCallback, useEffect, useState } from "react"
import { createReader, Enhancer, Manifest, ReaderWithEnhancer } from '@oboku/reader'

type Options = Parameters<typeof createReader>[0]
type LoadOptions = Parameters<ReturnType<typeof createReader>['load']>[1]
type Pagination = ReturnType<ReturnType<typeof createReader>['getPaginationInfo']>

type Props<Ext = {}> = {
  manifest?: Manifest,
  onReady?: () => void,
  onReader?: (reader: ReaderWithEnhancer<Enhancer<Ext>>) => void,
  onPaginationChange?: (pagination: Pagination) => void,
  options?: Omit<Options, 'containerElement'>,
  loadOptions?: LoadOptions & {
    cfi?: string
  },
  enhancer?: Enhancer<Ext>
}

export function Reader<Ext = {}, >({ manifest, onReady, onReader, loadOptions, options, onPaginationChange, enhancer }: Props<Ext>) {
  const [reader, setReader] = useState<ReaderWithEnhancer<Enhancer<Ext>> | undefined>(undefined)

  const onRef = useCallback(ref => {
    if (ref && !reader) {
      const reader = createReader({ containerElement: ref, ...options }, enhancer)
      setReader(reader)
      onReader && onReader(reader)
    }
  }, [setReader, onReader, reader, options])

  useEffect(() => {
    const readerSubscription$ = reader?.$.subscribe((data) => {
      if (data.type === 'ready') {
        onReady && onReady()
      }
    })

    const paginationSubscription = reader?.pagination$.subscribe(data => {
      if (data.event === 'change') {
        onPaginationChange && onPaginationChange(reader.getPaginationInfo())
      }
    })

    return () => {
      readerSubscription$?.unsubscribe()
      paginationSubscription?.unsubscribe()
    }
  }, [reader, onReady])

  useEffect(() => {
    if (manifest && reader) {
      reader.load(manifest, loadOptions, loadOptions?.cfi)
    }
  }, [manifest, reader, loadOptions])

  useEffect(() => {
    return () => reader?.destroy()
  }, [reader])

  return (
    <div
      style={styles.reader}
      ref={onRef}
    />
  )
}

const styles = {
  reader: {
    width: `100%`,
    height: `100%`
  }
}
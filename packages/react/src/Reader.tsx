import React, { useCallback, useEffect, useState } from "react"
import { createReader, Enhancer, Manifest, ReaderWithEnhancer, Reader } from '@oboku/reader'

type Options = Parameters<typeof createReader>[0]
type LoadOptions = Parameters<ReturnType<typeof createReader>['load']>[1]
type Pagination = ReturnType<ReturnType<typeof createReader>['pagination']['getInfo']>

type Props<Ext = {}> = {
  manifest?: Manifest,
  options?: Omit<Options, 'containerElement'>,
  loadOptions?: LoadOptions,
  enhancer?: Enhancer<Ext>,
  onReader?: (reader: ReaderWithEnhancer<Enhancer<Ext>>) => void,
  onReady?: () => void,
  onPaginationChange?: (pagination: Pagination) => void,
}

export function Reader<Ext = {},>({ manifest, onReady, onReader, loadOptions, options, onPaginationChange, enhancer }: Props<Ext>) {
  const [reader, setReader] = useState<ReaderWithEnhancer<Enhancer<Ext>> | undefined>(undefined)

  const onRef = useCallback(ref => {
    if (ref && !reader) {
      const reader = createReader({ containerElement: ref, ...options }, enhancer)
      setReader(reader)
      onReader && onReader(reader)
    }
  }, [setReader, onReader, reader, options])

  useEffect(() => {
    const readerSubscription$ = reader?.$.ready$.subscribe(() => {
      onReady && onReady()
    })

    return () => {
      readerSubscription$?.unsubscribe()
    }
  }, [reader, onReady])

  useEffect(() => {
    const paginationSubscription = reader?.pagination.$.subscribe(data => {
      onPaginationChange && onPaginationChange(data)
    })

    return () => {
      paginationSubscription?.unsubscribe()
    }
  }, [onPaginationChange, reader])

  useEffect(() => {
    if (manifest && reader) {
      reader.load(manifest, loadOptions)
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
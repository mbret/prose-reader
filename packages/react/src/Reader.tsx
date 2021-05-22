import React, { useCallback, useEffect, useState } from "react"
import { createReader, Manifest } from '@oboku/reader'

type Options = Parameters<typeof createReader>[0]
type LoadOptions = Parameters<ReturnType<typeof createReader>['load']>[1]
type Pagination = ReturnType<ReturnType<typeof createReader>['getPaginationInfo']>

type Props = {
  manifest?: Manifest,
  onReady?: () => void,
  onReader?: (reader: ReturnType<typeof createReader>) => void,
  onPaginationChange?: (pagination: Pagination) => void,
  options?: Omit<Options, 'containerElement'>,
  loadOptions?: LoadOptions & {
    cfi?: string
  }
}

export const Reader = ({ manifest, onReady, onReader, loadOptions, options, onPaginationChange }: Props) => {
  const [reader, setReader] = useState<ReturnType<typeof createReader> | undefined>(undefined)

  const onRef = useCallback(ref => {
    if (ref && !reader) {
      const reader = createReader({ containerElement: ref, ...options })
      setReader(reader)
      onReader && onReader(reader)
    }
  }, [setReader, onReader, reader, options])

  useEffect(() => {
    const readerSubscription$ = reader?.$.subscribe((data) => {
      if (data.event === 'ready') {
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
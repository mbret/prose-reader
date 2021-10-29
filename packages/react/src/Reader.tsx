import React, { useCallback, useEffect, useState } from "react"
import { createReader, Enhancer, Manifest, Reader } from '@oboku/reader'

type Options = Parameters<typeof createReader>[0]
type LoadOptions = Parameters<ReturnType<typeof createReader>['load']>[1]
type Pagination = ReturnType<ReturnType<typeof createReader>['pagination']['getInfo']>
type EnhancerOptions<E extends Enhancer | void> = E extends Enhancer ? Parameters<ReturnType<E>>[0] & Options : Options 

type Props<UserEnhancer extends Enhancer | void> = {
  manifest?: Manifest,
  options?: Omit<EnhancerOptions<UserEnhancer>, 'containerElement'>,
  loadOptions?: LoadOptions,
  enhancer?: UserEnhancer,
  onReader?: (reader: Reader<UserEnhancer>) => void,
  onReady?: () => void,
  onPaginationChange?: (pagination: Pagination) => void,
}

export function Reader<UserEnhancer extends Enhancer | void>({ manifest, onReady, onReader, loadOptions, options, onPaginationChange, enhancer }: Props<UserEnhancer>) {
  const [reader, setReader] = useState<Reader<UserEnhancer> | undefined>(undefined)

  const onRef = useCallback(ref => {
    if (ref && !reader) {
      const readerOptions = { containerElement: ref, ...options }
      const reader: any = enhancer ? createReader(readerOptions, enhancer) : createReader(readerOptions)
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
import React, { useEffect, useMemo, useRef, useState } from "react"
import { createReader, Enhancer, Manifest, Reader } from '@prose-reader/core'

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
  layout?: { height: number, width: number } | `cover`
}

export function Reader<UserEnhancer extends Enhancer | void>({ layout = `cover`, manifest, onReady, onReader, loadOptions, options, onPaginationChange, enhancer }: Props<UserEnhancer>) {
  const [reader, setReader] = useState<Reader<UserEnhancer> | undefined>(undefined)
  const { width, height } = layout === `cover` ? { width: `100%`, height: `100%` } : layout
  const ref = useRef<HTMLElement>()

  useEffect(() => {
    if (ref.current && !reader) {
      const readerOptions = { containerElement: ref.current, ...options }
      const reader: any = enhancer ? createReader(readerOptions, enhancer) : createReader(readerOptions)
      setReader(reader)
      onReader && onReader(reader)
    }
  }, [ref.current, setReader, onReader, reader, options])

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

  useReaderReLayout(reader, ref.current, height, width)

  useEffect(() => {
    return () => reader?.destroy()
  }, [reader])

  const style = useMemo(() => ({
    width,
    height
  }), [height, width])

  return (
    <div
      style={style}
      ref={ref as any}
    />
  )
}

const useReaderReLayout = (reader: Reader | undefined, container: HTMLElement | undefined, height: number | string, width: number | string) => {
  useEffect(() => {
    if (typeof width === `number` && typeof height === `number`) {
      reader?.layout()
    } else if (container) {
      const observer = new ResizeObserver(() => {
        reader?.layout()
      })

      observer.observe(container)

      return () => {
        observer.disconnect()
      }
    }
  }, [height, width, container])
}
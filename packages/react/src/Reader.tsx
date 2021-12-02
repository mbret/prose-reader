import React, { useEffect, useMemo, useRef, useState } from "react"
import { createReader, Manifest, Reader as CoreReader } from '@prose-reader/core'
import { ObservedValueOf } from "rxjs"

type Enhancer<Api = {}> = (createReader: any) => (options: any) => Api
type Options = Parameters<typeof createReader>[0]
type LoadOptions = Parameters<ReturnType<typeof createReader>['load']>[1]
type Pagination = ObservedValueOf<CoreReader['$']['pagination$']>
type EnhancerOptions<E extends Enhancer | void> = E extends Enhancer ? Parameters<ReturnType<E>>[0] & Options : Options

type Props<UserEnhancer extends Enhancer | void> = {
  manifest?: Manifest,
  options?: Omit<EnhancerOptions<UserEnhancer>, 'containerElement'>,
  loadOptions?: LoadOptions,
  enhancer?: UserEnhancer,
  onReader?: (reader: CoreReader<UserEnhancer>) => void,
  onReady?: () => void,
  onPaginationChange?: (pagination: Pagination) => void,
}

export const Reader = <UserEnhancer extends Enhancer | void>({ manifest, onReady, onReader, loadOptions, options, onPaginationChange, enhancer }: Props<UserEnhancer>) => {
  const [reader, setReader] = useState<CoreReader<UserEnhancer> | undefined | CoreReader>(undefined)
  const { width, height } = { width: `100%`, height: `100%` }
  const ref = useRef<HTMLElement>()

  useEffect(() => {
    if (ref.current && !reader) {
      const readerOptions = { containerElement: ref.current, ...options }
      const reader = enhancer ? createReader(readerOptions, enhancer) : createReader(readerOptions)
      setReader(reader)
      onReader && onReader(reader as any)
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
    const paginationSubscription = reader?.$.pagination$.subscribe(data => {
      onPaginationChange && onPaginationChange(data)
    })

    return () => {
      paginationSubscription?.unsubscribe()
    }
  }, [onPaginationChange, reader])

  useEffect(() => {
    if (manifest && reader) {
      reader.load(manifest, loadOptions as any)
    }
  }, [manifest, reader, loadOptions])

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
import React, { memo, ReactElement, useEffect, useMemo, useRef, useState } from "react"
import ReactDOM from "react-dom"
import { createReader, Manifest, Reader as CoreReader, ReaderOptions } from '@prose-reader/core'
import { ObservedValueOf } from "rxjs"

type Enhancer<Api = {}> = (createReader: any) => (options: any) => Api
type LoadOptions = Parameters<ReturnType<typeof createReader>['load']>[1]
type Pagination = ObservedValueOf<CoreReader['$']['pagination$']>

export type Props<UserEnhancer extends Enhancer = Enhancer> = {
  manifest?: Manifest,
  options?: Omit<ReaderOptions<UserEnhancer>, 'containerElement'>,
  loadOptions?: LoadOptions,
  enhancer?: UserEnhancer,
  onReader?: (reader: CoreReader<UserEnhancer>) => void,
  onReady?: () => void,
  onPaginationChange?: (pagination: Pagination) => void,
  LoadingElement?: ReactElement
}

const Reader = <UserEnhancer extends Enhancer = Enhancer>({
  manifest,
  onReady,
  onReader,
  loadOptions,
  options,
  onPaginationChange,
  enhancer,
  LoadingElement
}: Props<UserEnhancer>) => {
  const [reader, setReader] = useState<CoreReader<UserEnhancer> | undefined | CoreReader>(undefined)
  const [loadingElementContainers, setLoadingElementContainers] = useState<HTMLElement[]>([])
  const { width, height } = { width: `100%`, height: `100%` }
  const hasLoadingElement = !!LoadingElement
  const ref = useRef<HTMLElement>()

  useEffect(() => {
    if (ref.current && !reader) {
      const { } = options || {}
      const readerOptions = {
        containerElement: ref.current,
        ...hasLoadingElement && {
          // we override loading element creator but don't do anything yet
          loadingElementCreate: ({ container }: { container: HTMLElement }) => container,
        },
        ...options
      }
      const reader = enhancer ? createReader(readerOptions, enhancer) : createReader(readerOptions)
      setReader(reader as any)
      onReader && onReader(reader as any)
    }
  }, [ref.current, setReader, onReader, reader, options, hasLoadingElement])

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

  useEffect(() => {
    if (hasLoadingElement && reader) {
      const subscription = reader.loading.$.items$
        .subscribe(entries => {
          setLoadingElementContainers(Object.values(entries))
        })

      return () => subscription.unsubscribe()
    }
  }, [reader, hasLoadingElement])

  const style = useMemo(() => ({
    width,
    height
  }), [height, width])

  return (
    <>
      <div
        style={style}
        ref={ref as any}
      />
      {loadingElementContainers.map(element =>
        ReactDOM.createPortal(
          LoadingElement,
          element
        )
      )}
    </>
  )
}

const MemoizedReader = memo(Reader) as <UserEnhancer extends Enhancer = Enhancer>(props: Props<UserEnhancer>) => JSX.Element

export {
  MemoizedReader as Reader
}
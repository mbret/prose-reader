import React, { ReactElement, useEffect, useMemo, useRef, useState } from "react"
import ReactDOM from "react-dom"
import { Manifest, Reader as ReaderInstance, Report } from "@prose-reader/core"

const report = Report.namespace("@prose-reader/react")

export type Props<Options extends object, Instance extends ReaderInstance> = {
  manifest?: Manifest
  options?: Omit<Options, "containerElement">
  loadOptions?: Omit<Parameters<Instance["load"]>[1], "containerElement">
  createReader: (options: Options) => Instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReader?: (reader: any) => void
  onReady?: () => void
  LoadingElement?: ReactElement
}

export const Reader = <Options extends object, Instance extends ReaderInstance>({
  manifest,
  onReady,
  onReader,
  loadOptions,
  options,
  LoadingElement,
  createReader,
}: Props<Options, Instance>) => {
  const [reader, setReader] = useState<ReturnType<typeof createReader> | undefined>(undefined)
  const [loadingElementContainers, setLoadingElementContainers] = useState<HTMLElement[]>([])
  const { width, height } = { width: `100%`, height: `100%` }
  const hasLoadingElement = !!LoadingElement
  const ref = useRef<HTMLDivElement | null>(null)
  const readerInitialized = useRef(false)

  useEffect(() => {
    if (!ref.current || !!reader) return

    if (readerInitialized.current) {
      report.warn(
        "One of the props relative to the reader creation has changed but the reader is already initialized. Please make sure to memoize or delay the render!",
      )

      return
    }

    if (ref.current && !reader && options) {
      readerInitialized.current = true
      const readerOptions = {
        ...(hasLoadingElement && {
          // we override loading element creator but don't do anything yet
          loadingElementCreate: ({ container }: { container: HTMLElement }) => container,
        }),
        ...options,
      } as Options

      const newReader = createReader(readerOptions)

      setReader(newReader)
      onReader && onReader(newReader)
    }
  }, [setReader, onReader, reader, options, hasLoadingElement])

  useEffect(() => {
    const readerSubscription$ = reader?.$.loadStatus$.subscribe((status) => {
      if (status === "ready") {
        onReady && onReady()
      }
    })

    return () => {
      readerSubscription$?.unsubscribe()
    }
  }, [reader, onReady])

  useEffect(() => {
    if (manifest && reader && loadOptions && ref.current) {
      reader.load(manifest, {
        ...loadOptions,
        containerElement: ref.current,
      })
    }
  }, [manifest, reader, loadOptions])

  useEffect(() => {
    return () => reader?.destroy()
  }, [reader])

  useEffect(() => {
    if (hasLoadingElement && reader) {
      const subscription = reader.loading.$.items$.subscribe((entries) => {
        setLoadingElementContainers(Object.values(entries))
      })

      return () => subscription.unsubscribe()
    }
  }, [reader, hasLoadingElement])

  const style = useMemo(
    () => ({
      width,
      height,
    }),
    [height, width],
  )

  return (
    <>
      <div style={style} ref={ref} />
      {loadingElementContainers.map((element) => ReactDOM.createPortal(LoadingElement, element))}
    </>
  )
}

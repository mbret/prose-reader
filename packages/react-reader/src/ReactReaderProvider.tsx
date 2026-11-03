import { memo, type ReactNode } from "react"
import { useSyncAnnotationsWithReader } from "./annotations/useSyncAnnotationsWithReader"
import type { ProviderContextType, ReactReaderReader } from "./context/context"
import { ReaderContextProvider } from "./context/ReaderContextProvider"
import { ReaderLifecycle } from "./ReaderLifecycle"
import { SyncReaderWithManagedSettings } from "./settings/SyncReaderWithManagedSettings"
import { useZoomSettings } from "./zoom/useZoomSettings"

const ReaderEffects = memo(function ReaderEffects() {
  useZoomSettings()
  useSyncAnnotationsWithReader()

  return <SyncReaderWithManagedSettings />
})

export type ReactReaderProviderProps = ProviderContextType & {
  /**
   * Creates the reader. The provider writes the settings it manages into it,
   * mounts it in the element of its `ReactReader`, and destroys it when the
   * provider unmounts, when `createReader` changes, or when `ReactReader`
   * unmounts. Memoize it: a new function creates a new reader. Return a new
   * reader on each call: a `ReactReader` rendered again gets a new one. Leave
   * it `undefined` until a reader can be created.
   */
  createReader: (() => ReactReaderReader) | undefined
  children?: ReactNode
}

/**
 * Holds the reader and the settings react-reader manages, and renders nothing
 * itself. Render it above `ReactReader`, the view, and above whatever hides
 * the view: the reader lives as long as the provider and the element of its
 * view.
 */
export function ReactReaderProvider({
  createReader,
  children,
  ...props
}: ReactReaderProviderProps) {
  return (
    <ReaderContextProvider {...props}>
      <ReaderLifecycle createReader={createReader} />
      <ReaderEffects />
      {children}
    </ReaderContextProvider>
  )
}

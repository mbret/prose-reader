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
   * Creates the reader. The provider writes the settings it manages into the
   * reader and mounts it in the element of its `ReactReader`. It destroys the
   * reader when the provider unmounts, when `createReader` changes, or when
   * the `ReactReader` unmounts while it shows. Memoize it: a new function
   * creates a new reader. Return a new reader on each call: the provider
   * calls it again for the next `ReactReader`. Pass `undefined` until you can
   * create the reader.
   */
  createReader: (() => ReactReaderReader) | undefined
  children?: ReactNode
}

/**
 * Holds the reader and the settings react-reader manages, and renders nothing
 * itself. Render it above `ReactReader`, the view, and above whatever hides
 * the view. Hiding the provider, in an `<Activity>` for example, destroys the
 * reader. Hiding `ReactReader` keeps it.
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

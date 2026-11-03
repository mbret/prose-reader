import { Box } from "@chakra-ui/react"
import { useEffect, useRef } from "react"
import { useLiveRef } from "reactjrx"
import type { ReactReaderReader, ReaderContextType } from "./context/context"
import { useReaderContext } from "./context/useReaderContext"
import { getManagedSettingValuesInEffect } from "./settings/appSettingValues"
import type { ReactReaderSettings } from "./settings/managedSettings"
import { useScreenSettingsScopeReference } from "./settings/useScreenSettingsScopeReference"

/**
 * The element the book shows in. The reader is created with the values the
 * settings react-reader manages take, mounted there, and destroyed when this
 * unmounts or when `createReader` changes.
 */
export function ReaderMountPoint<TReader extends ReactReaderReader>({
  createReader,
  onReaderChange,
}: {
  createReader: ((settings: ReactReaderSettings) => TReader) | undefined
  onReaderChange: ((reader: TReader | undefined) => void) | undefined
}) {
  const context = useReaderContext()
  const readerElementRef = useRef<HTMLDivElement>(null)
  const screen = useScreenSettingsScopeReference()
  const screenRef = useLiveRef(screen)
  const onReaderChangeRef = useLiveRef(onReaderChange)

  useEffect(
    function createReaderInItsElement() {
      const readerElement = readerElementRef.current

      if (!createReader || !readerElement) return

      const reader = createReader(
        getManagedSettingValuesInEffect(context.value, screenRef.current),
      )

      reader.mount(readerElement)
      context.update((old): ReaderContextType => ({ ...old, reader }))
      onReaderChangeRef.current?.(reader)

      return function destroyReader() {
        reader.destroy()
        context.update((old) => ({ ...old, reader: undefined }))
        onReaderChangeRef.current?.(undefined)
      }
    },
    [createReader, context, screenRef, onReaderChangeRef],
  )

  return <Box ref={readerElementRef} width="100%" height="100%" />
}

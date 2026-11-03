import { Box } from "@chakra-ui/react"
import { useEffect, useRef } from "react"
import { useLiveRef } from "reactjrx"
import type { ReactReaderReader, ReaderContextType } from "./context/context"
import { useReaderContext } from "./context/useReaderContext"
import { getManagedSettingValuesInEffect } from "./settings/appSettingValues"
import { useScreenSettingsScopeReference } from "./settings/useScreenSettingsScopeReference"

export function ReaderMountPoint<TReader extends ReactReaderReader>({
  createReader,
  onReaderChange,
}: {
  createReader: (() => TReader) | undefined
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

      const reader = createReader()
      const onReaderChangeAtCreation = onReaderChangeRef.current

      reader.settings.update(
        getManagedSettingValuesInEffect(context.value, screenRef.current),
      )
      reader.mount(readerElement)
      context.update((old): ReaderContextType => ({ ...old, reader }))
      onReaderChangeAtCreation?.(reader)

      return function destroyReader() {
        reader.destroy()
        context.update((old) => ({ ...old, reader: undefined }))
        onReaderChangeAtCreation?.(undefined)
      }
    },
    [createReader, context, screenRef, onReaderChangeRef],
  )

  return <Box ref={readerElementRef} width="100%" height="100%" />
}

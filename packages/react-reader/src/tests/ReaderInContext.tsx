import { useLayoutEffect } from "react"
import type { ReactReaderReader } from "../context/context"
import { useReaderContext } from "../context/useReaderContext"

/**
 * Puts a reader in the context, where `ReactReaderProvider` puts the reader it
 * creates, so the components under it read the reader a test passes.
 */
export function ReaderInContext({
  reader,
}: {
  reader: ReactReaderReader | undefined
}) {
  const context = useReaderContext()

  useLayoutEffect(
    function putReaderInContext() {
      context.update((old) => ({ ...old, reader }))
    },
    [context, reader],
  )

  return null
}

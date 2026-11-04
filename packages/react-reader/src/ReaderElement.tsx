import { Box } from "@chakra-ui/react"
import { useEffect, useRef } from "react"
import { useReaderContext } from "./context/useReaderContext"

/** The element the provider mounts the reader in, lent while the view shows. */
export function ReaderElement() {
  const context = useReaderContext()
  const readerElementRef = useRef<HTMLDivElement>(null)

  useEffect(
    function lendReaderElementToProvider() {
      const readerElement = readerElementRef.current

      if (!readerElement) return

      const isElementOfAnotherViewLent =
        !!context.value.readerElement &&
        context.value.readerElement !== readerElement

      if (isElementOfAnotherViewLent) {
        throw new Error(`Render one ReactReader per ReactReaderProvider`)
      }

      context.update((old) => ({ ...old, readerElement }))

      return function takeBackReaderElement() {
        context.update((old) =>
          old.readerElement === readerElement
            ? { ...old, readerElement: undefined }
            : old,
        )
      }
    },
    [context],
  )

  return <Box ref={readerElementRef} width="100%" height="100%" />
}

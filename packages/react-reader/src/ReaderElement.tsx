import { Box } from "@chakra-ui/react"
import { useEffect, useRef } from "react"
import { useReaderContext } from "./context/useReaderContext"

/**
 * The element the provider mounts the reader in. The provider keeps the reader
 * while the element is in the document: an `<Activity>` hiding the view leaves
 * it there.
 */
export function ReaderElement() {
  const context = useReaderContext()
  const readerElementRef = useRef<HTMLDivElement>(null)

  useEffect(
    function lendReaderElementToProvider() {
      const readerElement = readerElementRef.current

      if (!readerElement) return

      const lentReaderElement = context.value.readerElement
      const isElementOfAnotherViewInDocument =
        !!lentReaderElement &&
        lentReaderElement !== readerElement &&
        lentReaderElement.isConnected

      if (isElementOfAnotherViewInDocument) {
        throw new Error(`Render one ReactReader per ReactReaderProvider`)
      }

      context.update((old) => ({ ...old, readerElement }))

      return function takeBackReaderElementOnceRemoved() {
        const isReaderElementInDocument = readerElement.isConnected

        if (isReaderElementInDocument) return

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

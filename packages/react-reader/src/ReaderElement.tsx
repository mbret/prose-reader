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
  const hiddenReaderElementRemovalObserverRef = useRef<MutationObserver>(null)

  useEffect(
    function lendReaderElementToProvider() {
      const readerElement = readerElementRef.current

      if (!readerElement) return

      hiddenReaderElementRemovalObserverRef.current?.disconnect()

      const lentReaderElement = context.value.readerElement
      const isElementOfAnotherViewInDocument =
        !!lentReaderElement &&
        lentReaderElement !== readerElement &&
        lentReaderElement.isConnected

      if (isElementOfAnotherViewInDocument) {
        throw new Error(`Render one ReactReader per ReactReaderProvider`)
      }

      context.update((old) => ({ ...old, readerElement }))

      function takeBackReaderElement() {
        context.update((old) =>
          old.readerElement === readerElement
            ? { ...old, readerElement: undefined }
            : old,
        )
      }

      // A passive cleanup runs once React removed the element of an unmounted
      // view. An `<Activity>` hiding the view leaves the element in the
      // document, and React tells nothing when it removes it later: until the
      // view shows again, an observer of the element's root node, the document
      // or a shadow root, reads `isConnected` after each batch of changes.
      return function takeBackReaderElementOnceRemoved() {
        if (!readerElement.isConnected) {
          takeBackReaderElement()

          return
        }

        const hiddenReaderElementRemovalObserver = new MutationObserver(
          function takeBackHiddenReaderElementOnceRemoved() {
            if (readerElement.isConnected) return

            hiddenReaderElementRemovalObserver.disconnect()
            takeBackReaderElement()
          },
        )

        hiddenReaderElementRemovalObserver.observe(
          readerElement.getRootNode(),
          {
            childList: true,
            subtree: true,
          },
        )
        hiddenReaderElementRemovalObserverRef.current =
          hiddenReaderElementRemovalObserver
      }
    },
    [context],
  )

  return <Box ref={readerElementRef} width="100%" height="100%" />
}

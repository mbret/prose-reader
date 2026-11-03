import { Box } from "@chakra-ui/react"
import { memo, useEffect, useRef } from "react"
import { useReader } from "./context/useReader"
import { SyncReaderWithManagedSettings } from "./settings/SyncReaderWithManagedSettings"

/**
 * The element the reader renders the book into. The reader is mounted there
 * once the settings react-reader manages are written, so its first layout
 * uses them. Each reader gets an element of its own, so it never shares one
 * with a previous reader the app has not destroyed yet.
 */
export const ReaderMountPoint = memo(function ReaderMountPoint() {
  const reader = useReader()
  const readerElementRef = useRef<HTMLDivElement>(null)

  useEffect(
    function mountReaderIntoItsElement() {
      const readerElement = readerElementRef.current

      if (!reader || !readerElement || reader.context.isDestroyed) return

      const mountedElement = reader.context.value.rootElement
      const isMountedIntoItsElement = mountedElement === readerElement

      if (isMountedIntoItsElement) return

      if (mountedElement) {
        throw new Error(
          `This reader is already mounted into another element, by your app or by a ReactReader rendered before. ReactReader mounts the reader it receives: create the reader without calling mount(), and give ReactReader a new reader whenever it remounts.`,
        )
      }

      reader.mount(readerElement)
    },
    [reader],
  )

  // The sync must be a child: React runs a child's effects before its
  // parent's, so the managed settings are written before the mount.
  return (
    <>
      <SyncReaderWithManagedSettings />
      {reader && (
        <Box
          key={reader.id}
          ref={readerElementRef}
          width="100%"
          height="100%"
        />
      )}
    </>
  )
})

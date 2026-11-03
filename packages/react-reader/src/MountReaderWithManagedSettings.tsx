import { Box } from "@chakra-ui/react"
import { memo, useEffect, useRef } from "react"
import { useReader } from "./context/useReader"
import { SyncReaderWithManagedSettings } from "./settings/SyncReaderWithManagedSettings"

/**
 * The element the reader renders the book into. The reader is mounted in it
 * once the settings react-reader manages are written, so its first layout
 * uses them. Each reader gets an element of its own.
 */
export const MountReaderWithManagedSettings = memo(
  function MountReaderWithManagedSettings() {
    const reader = useReader()
    const readerElementRef = useRef<HTMLDivElement>(null)

    useEffect(
      function mountReaderIntoItsElement() {
        const readerElement = readerElementRef.current

        if (!reader || !readerElement || reader.context.isDestroyed) return

        const mountedElement = reader.context.value.rootElement
        const isMountedIntoItsElement = mountedElement === readerElement
        const isMountedElsewhere =
          mountedElement !== undefined && !isMountedIntoItsElement

        if (isMountedElsewhere) {
          throw new Error(
            `ReactReader mounts the reader it receives, and this one is already mounted elsewhere. Create it without calling mount(), and give each ReactReader its own reader.`,
          )
        }

        if (!isMountedIntoItsElement) reader.mount(readerElement)
      },
      [reader],
    )

    // The sync stays a child: React runs a child's effects before its
    // parent's, so the managed settings are written before the mount.
    return (
      <>
        <SyncReaderWithManagedSettings />
        <Box
          key={reader?.id}
          ref={readerElementRef}
          width="100%"
          height="100%"
        />
      </>
    )
  },
)

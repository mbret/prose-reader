import type { Manifest, Reader } from "@prose-reader/core"
import { linkBridge } from "@webview-bridge/web"
import type { ProseBridgeStore, ProsePostMessageSchema } from "../shared"

// Annotated rather than inferred: `Reader` is a large enough type that
// declaration emit gives up serialising the inferred shape (TS7056).
export type ReaderBridgeController = {
  /**
   * The reader currently rendering, or `undefined` before the first `load`
   * event and while one is being replaced.
   */
  getReader: () => Reader | undefined
}

export const createReaderBridge = () => {
  const bridge = linkBridge<ProseBridgeStore, ProsePostMessageSchema>({
    onReady: async () => {
      // bridge ready
    },
  })

  return bridge
}

export const bridgeReader = ({
  bridge,
  createReader,
  containerElement,
}: {
  /**
   * Factory invoked for every `load` event coming from the native side.
   * A reader renders a single book: a subsequent `load` destroys the
   * previous reader and creates a fresh one from the new manifest.
   */
  createReader: (manifest: Manifest) => Reader
  bridge: ReturnType<typeof createReaderBridge>
  containerElement: HTMLElement
}): ReaderBridgeController => {
  let reader: Reader | undefined

  bridge.addEventListener("load", (data) => {
    reader?.destroy()

    const newReader = createReader(data.manifest)

    reader = newReader

    // these subscriptions complete when the reader is destroyed
    newReader.pagination.state$.subscribe((state) => {
      bridge.setPagination(state)
    })

    newReader.context.subscribe(({ rootElement, ...rest }) => {
      bridge.setContext(rest)
    })

    newReader.mount(containerElement)
  })

  bridge.addEventListener("turnRight", () => {
    reader?.navigation.turnRight()
  })

  bridge.addEventListener("turnLeft", () => {
    reader?.navigation.turnLeft()
  })

  return {
    getReader: () => reader,
  }
}

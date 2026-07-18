import type {
  createReader as createReaderCore,
  Manifest,
} from "@prose-reader/core"
import { linkBridge } from "@webview-bridge/web"
import type { ProseBridgeStore, ProsePostMessageSchema } from "../shared"

type Reader = ReturnType<typeof createReaderCore>

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
}) => {
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

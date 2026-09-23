import type { Manifest, Reader } from "@prose-reader/core"
import { linkBridge } from "@webview-bridge/web"
import { Subscription } from "rxjs"
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
  let current: { reader: Reader; subscription: Subscription } | undefined

  bridge.addEventListener("load", (data) => {
    // Unsubscribe before destroying, so nothing the old reader emits while it
    // shuts down reaches the native side. Not every reader stream completes
    // on destroy (pagination does not), so the subscription is what ends.
    current?.subscription.unsubscribe()
    current?.reader.destroy()
    current = undefined

    const reader = createReader(data.manifest)
    const subscription = new Subscription()

    subscription.add(
      reader.pagination.state$.subscribe((state) => {
        bridge.setPagination(state)
      }),
    )

    subscription.add(
      reader.context.subscribe(({ rootElement, ...rest }) => {
        bridge.setContext(rest)
      }),
    )

    current = { reader, subscription }

    reader.mount(containerElement)
  })

  bridge.addEventListener("turnRight", () => {
    current?.reader.navigation.turnRight()
  })

  bridge.addEventListener("turnLeft", () => {
    current?.reader.navigation.turnLeft()
  })

  return {
    getReader: () => current?.reader,
  }
}

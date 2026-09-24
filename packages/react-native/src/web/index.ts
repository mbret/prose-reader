import type { Reader } from "@prose-reader/core"
import { linkBridge } from "@webview-bridge/web"
import { Subscription } from "rxjs"
import type {
  ProseBridgeStore,
  ProsePostMessageSchema,
  ReaderLoadOptions,
} from "../shared"

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
   * Factory invoked for every `load` event coming from the native side, with
   * the options that event carries: the manifest, and the cfi to open at.
   * A reader renders a single book: a subsequent `load` destroys the
   * previous reader and creates a fresh one from the new options.
   */
  createReader: (options: ReaderLoadOptions) => Reader
  bridge: ReturnType<typeof createReaderBridge>
  containerElement: HTMLElement
}): ReaderBridgeController => {
  let current: { reader: Reader; subscription: Subscription } | undefined

  bridge.addEventListener("load", ({ manifest, cfi }) => {
    // Unsubscribe before destroying, so nothing the old reader emits while it
    // shuts down reaches the native side. Not every reader stream completes
    // on destroy (pagination does not), so the subscription is what ends.
    current?.subscription.unsubscribe()
    current?.reader.destroy()
    current = undefined

    const reader = createReader({ manifest, cfi })
    const subscription = new Subscription()

    current = { reader, subscription }

    reader.mount(containerElement)

    /**
     * Relayed once the reader is mounted. A reader opened at a cfi only goes
     * there when mounted, and until then its reading position is the start
     * of the book: subscribed any earlier, that start is the first position
     * the native side receives, and saves. Every stream here replays its
     * current value, so nothing the mounted reader holds is missed.
     */
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

    subscription.add(
      reader.navigation.readingPosition$.subscribe((readingPosition) => {
        bridge.setReadingPosition(readingPosition)
      }),
    )
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

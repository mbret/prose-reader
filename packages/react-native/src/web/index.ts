import type { createReader as createReaderCore } from "@prose-reader/core"
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
  reader,
  containerElement,
}: {
  reader: Reader
  bridge: ReturnType<typeof createReaderBridge>
  containerElement: HTMLElement
}): Reader => {
  bridge.addEventListener("load", (data) => {
    reader.load({
      containerElement,
      manifest: data.manifest,
    })
  })

  bridge.addEventListener("turnRight", () => {
    reader.navigation.turnRight()
  })

  bridge.addEventListener("turnLeft", () => {
    reader.navigation.turnLeft()
  })

  reader.pagination.state$.subscribe((state) => {
    bridge.setPagination(state)
  })

  reader.context.state$.subscribe(({ rootElement, ...rest }) => {
    bridge.setContext(rest)
  })

  return reader
}

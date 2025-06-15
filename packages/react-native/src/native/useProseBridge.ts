import { bridge } from "@webview-bridge/react-native"
import { useState } from "react"
import { type BridgeMethods, type BridgeState, useLiveRef } from "../shared"

export const useProseBridge = (options: BridgeMethods) => {
  const optionsRef = useLiveRef(options)
  const [appBridge] = useState(() =>
    bridge<BridgeState & BridgeMethods>(({ set }) => ({
      pagination: undefined,
      setPagination: async (state) => {
        set({ pagination: state })
      },
      context: undefined,
      setContext: async (context) => {
        set({ context })
      },
      /**
       * For a given spine item, provide the resource to the webview.
       */
      async getResource(resource) {
        return optionsRef.current.getResource(resource)
      },
    })),
  )

  return appBridge
}

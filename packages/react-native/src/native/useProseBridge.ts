import { type BridgeStore, bridge } from "@webview-bridge/react-native"
import { useEffect, useState } from "react"
import { type BridgeMethods, type BridgeState, useLiveRef } from "../shared"

export const useProseBridge = (options: BridgeMethods) => {
  const [appBridge, setAppBridge] = useState<
    BridgeStore<BridgeState & BridgeMethods> | undefined
  >(undefined)
  const optionsRef = useLiveRef(options)

  useEffect(() => {
    const appBridge = bridge<BridgeState & BridgeMethods>(({ set }) => ({
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
    }))

    setAppBridge(appBridge)
  }, [optionsRef])

  return appBridge
}

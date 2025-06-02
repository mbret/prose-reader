import { useState, useEffect } from "react"
import { createWebView } from "@webview-bridge/react-native"
import type { Archive } from "@prose-reader/streamer"
import { useProseBridge, type BridgeMethods } from "@prose-reader/react-native"
import { appPostMessageSchema } from "./bridge"

export const useCreateReader = ({ archive }: { archive: Archive | null }) => {
  const [webviewBridge, setWebviewBridge] = useState<
    | ReturnType<
        typeof createWebView<BridgeMethods, typeof appPostMessageSchema>
      >
    | undefined
  >(undefined)
  const appBridge = useProseBridge(archive)

  useEffect(() => {
    if (!appBridge) return

    setWebviewBridge(
      createWebView({
        bridge: appBridge,
        debug: true,
        postMessageSchema: appPostMessageSchema,
      }),
    )
  }, [appBridge])

  return {
    webviewBridge,
    appBridge,
  }
}

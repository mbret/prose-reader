import type { Manifest } from "@prose-reader/streamer"
import { createWebView, postMessageSchema } from "@webview-bridge/react-native"
import { useCallback, useEffect, useState } from "react"
import type { BridgeMethods, ProsePostMessageSchema } from "../shared"
import { useProseBridge } from "./useProseBridge"

export const appPostMessageSchema = postMessageSchema<ProsePostMessageSchema>({
  load: {
    validate: (data) =>
      data as {
        manifest: Manifest
      },
  },
  turnRight: {
    validate: () => {},
  },
  turnLeft: {
    validate: () => {},
  },
})

export const useCreateReader = (options: BridgeMethods) => {
  const [webviewBridge, setWebviewBridge] = useState<
    | ReturnType<
        typeof createWebView<BridgeMethods, typeof appPostMessageSchema>
      >
    | undefined
  >(undefined)

  const appBridge = useProseBridge(options)
  const postMessage = webviewBridge?.postMessage

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

  const load = useCallback(
    (manifest: Manifest) => {
      postMessage?.("load", { manifest })
    },
    [postMessage],
  )

  if (!webviewBridge) return null

  return {
    webviewBridge,
    ReaderWebView: webviewBridge.WebView,
    appBridge,
    load,
  }
}

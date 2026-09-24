import { createWebView, postMessageSchema } from "@webview-bridge/react-native"
import { useCallback, useEffect, useState } from "react"
import type {
  BridgeMethods,
  ProsePostMessageSchema,
  ReaderLoadMessage,
  ReaderLoadOptions,
} from "../shared"
import { useProseBridge } from "./useProseBridge"

export const appPostMessageSchema = postMessageSchema<ProsePostMessageSchema>({
  load: {
    // The schema hands every message over as `unknown`. The only sender is
    // `load` below, which is typed, so this types the message rather than
    // checking it.
    validate: (data) => data as ReaderLoadMessage,
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

  const { appBridge, startLoad } = useProseBridge(options)
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
    (loadOptions: ReaderLoadOptions) => {
      if (!postMessage) return

      postMessage("load", { load: startLoad(), options: loadOptions })
    },
    [postMessage, startLoad],
  )

  if (!webviewBridge) return null

  return {
    webviewBridge,
    ReaderWebView: webviewBridge.WebView,
    appBridge,
    load,
  }
}

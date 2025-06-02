import { useBridge } from "@webview-bridge/react-native"
import type { BridgeState } from "../shared"
import { useProseReaderContext } from "./ReaderProvider"

export const useReaderState = <T = BridgeState>(
  selector: (state: BridgeState) => T,
) => {
  const { appBridge } = useProseReaderContext()

  return useBridge(appBridge, selector)
}

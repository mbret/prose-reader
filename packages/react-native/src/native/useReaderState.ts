import { useBridge } from "@webview-bridge/react-native"
import type { BridgeState } from "../shared/index.ts"
import { useProseReaderContext } from "./ReaderProvider.tsx"

export const useReaderState = <T = BridgeState>(
  selector: (state: BridgeState) => T,
) => {
  const { appBridge } = useProseReaderContext()

  return useBridge(appBridge, selector)
}

import { bridge } from "@webview-bridge/react-native"
import { useState } from "react"
import {
  type BridgeMethods,
  type BridgeState,
  type ReaderState,
  useLiveRef,
} from "../shared"

const noReaderState: ReaderState = {
  pagination: null,
  context: null,
  readingPosition: null,
}

/**
 * The native end of the bridge: the store the web side reports its reader's
 * state into, and `startLoad`, which every `load` goes through.
 */
export const createProseBridge = (
  getResource: BridgeMethods["getResource"],
) => {
  /**
   * The load the store's reader state belongs to. Only reports tagged with it
   * are kept, so nothing from the reader of an earlier load lands after the
   * next one starts, whenever it crosses the bridge.
   */
  let currentLoad = 0

  const appBridge = bridge<BridgeState & BridgeMethods>(({ set }) => ({
    ...noReaderState,
    report: async (load, state) => {
      if (load === currentLoad) set(state)
    },
    /**
     * For a given spine item, provide the resource to the webview.
     */
    getResource,
  }))

  /**
   * Starts a load: the previous book's state is cleared at once, rather than
   * left for the new reader to replace, and the load it returns is the only
   * one whose reports are kept from now on.
   */
  const startLoad = () => {
    currentLoad += 1
    appBridge.setState(noReaderState)

    return currentLoad
  }

  return { appBridge, startLoad }
}

export const useProseBridge = (options: BridgeMethods) => {
  const optionsRef = useLiveRef(options)
  const [proseBridge] = useState(() =>
    createProseBridge((resource) => optionsRef.current.getResource(resource)),
  )

  return proseBridge
}

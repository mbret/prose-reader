import { useProseReaderContext } from "./ReaderProvider"

export const useReader = () => {
  const { webviewBridge } = useProseReaderContext()
  const { postMessage } = webviewBridge

  return {
    turnRight: () => {
      postMessage("turnRight", undefined)
    },
    turnLeft: () => {
      postMessage("turnLeft", undefined)
    },
  }
}

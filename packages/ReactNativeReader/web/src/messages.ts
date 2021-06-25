import { Subject } from "rxjs"
import { MessageDown, MessageUp } from "./types/shared"

export const messagesDown$ = new Subject<MessageDown>()

export const postMessage = (message: MessageUp) => {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message))
}

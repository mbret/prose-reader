import type { Reader } from "@prose-reader/core"
import type { EnhancerAPI as GesturesEnhancerAPI } from "@prose-reader/enhancer-gestures"
import { type Context, createContext } from "react"
import { type Signal, signal } from "reactjrx"
import { Subject } from "rxjs"
import type { ReaderNotification } from "../notifications/types"

type ContextType = {
  reader: (Reader & GesturesEnhancerAPI) | undefined
  quickMenuSignal: Signal<boolean, undefined>
  notificationsSubject: Subject<ReaderNotification>
}

export const ReaderContext: Context<ContextType> = createContext<ContextType>({
  reader: undefined,
  quickMenuSignal: signal({ default: false }),
  notificationsSubject: new Subject<ReaderNotification>(),
})

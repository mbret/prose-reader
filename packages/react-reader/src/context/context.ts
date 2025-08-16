import type { Reader } from "@prose-reader/core"
import type { EnhancerAPI as GesturesEnhancerAPI } from "@prose-reader/enhancer-gestures"
import { type Context, createContext } from "react"
import { type Signal, type SignalValue, signal } from "reactjrx"
import { Subject } from "rxjs"
import type { ReaderNotification } from "../notifications/types"

type ContextType = {
  reader: (Reader & GesturesEnhancerAPI) | undefined
  quickMenuSignal: Signal<boolean, undefined>
  quickMenuBottomBarBoundingBox: Signal<ResizeObserverEntry | undefined>
  notificationsSubject: Subject<ReaderNotification>
  refitMenuSignal: Signal<boolean, undefined>
}

export const ReaderContext: Context<ContextType> = createContext<ContextType>({
  reader: undefined,
  quickMenuSignal: signal({ default: false }),
  quickMenuBottomBarBoundingBox: signal<
    SignalValue<ContextType["quickMenuBottomBarBoundingBox"]>
  >({ default: undefined }),
  notificationsSubject: new Subject<ReaderNotification>(),
  refitMenuSignal: signal({ default: false }),
})

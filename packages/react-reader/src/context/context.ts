import type { Reader } from "@prose-reader/core"
import type { EnhancerAPI as GesturesEnhancerAPI } from "@prose-reader/enhancer-gestures"
import { createContext } from "react"
import { type Signal, signal } from "reactjrx"
import { Subject } from "rxjs"
import type { ReaderNotification } from "../notifications/types"
import type { SETTING_SCOPE } from "../settings/types"

export type ReaderContextType = {
  reader: (Reader & GesturesEnhancerAPI) | undefined
  quickMenuOpen: boolean
  onQuickMenuOpenChange: (open: boolean) => void
  quickMenuBottomBarBoundingBoxSignal: Signal<ResizeObserverEntry | undefined>
  notificationsSubject: Subject<ReaderNotification>
  refitMenuOpen: boolean
  onRefitMenuOpenChange: (open: boolean) => void
  fontSizeMenuOpen: boolean
  onFontSizeMenuOpenChange: (open: boolean) => void
  fontSize?: number
  onFontSizeValueChange: (value: number) => void
  fontSizeMin: number
  fontSizeMax: number
  fontSizeScopeValue: SETTING_SCOPE
  onFontSizeScopeValueChange: (scope: SETTING_SCOPE) => void
}

export const getDefaultValue = (): ReaderContextType => ({
  reader: undefined,
  quickMenuOpen: false,
  onQuickMenuOpenChange: () => {},
  quickMenuBottomBarBoundingBoxSignal: signal<ResizeObserverEntry | undefined>({
    default: undefined,
  }),
  notificationsSubject: new Subject<ReaderNotification>(),
  refitMenuOpen: false,
  onRefitMenuOpenChange: () => {},
  fontSizeMenuOpen: true,
  onFontSizeMenuOpenChange: () => {},
  fontSize: 1,
  fontSizeMin: 0.2,
  fontSizeMax: 5,
  fontSizeScopeValue: "book" satisfies SETTING_SCOPE,
  onFontSizeValueChange: () => {},
  onFontSizeScopeValueChange: () => {},
})

export const ReaderContext = createContext(
  signal({ default: getDefaultValue() }),
)

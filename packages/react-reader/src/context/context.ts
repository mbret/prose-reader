import type { Reader } from "@prose-reader/core"
import type { EnhancerAPI as GesturesEnhancerAPI } from "@prose-reader/enhancer-gestures"
import { createContext } from "react"
import { type Signal, signal } from "reactjrx"
import { Subject } from "rxjs"
import type { ReaderNotification } from "../notifications/types"
import type { SETTING_SCOPE, SETTING_SCOPE_REFERENCE } from "../settings/types"

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
  onFontSizeChange?: (scope: SETTING_SCOPE_REFERENCE, value: number) => void
  fontSizeMin: number
  fontSizeMax: number
  fontSizeScope?: SETTING_SCOPE_REFERENCE
  onFontSizeScopeChange?: (scope: SETTING_SCOPE) => void
  /**
   * Internal fallback values used for uncontrolled settings. This way the
   * Reader works as intended but:
   * - there are no persistent settings
   * - the settings are valid only for the current mount runtime
   */
  uncontrolledFontSize: number
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
  fontSizeMenuOpen: false,
  onFontSizeMenuOpenChange: () => {},
  fontSizeMin: 0.2,
  fontSizeMax: 5,
  uncontrolledFontSize: 1,
})

export const ReaderContext = createContext(
  signal({ default: getDefaultValue() }),
)

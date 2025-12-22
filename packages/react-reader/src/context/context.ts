import type { Reader } from "@prose-reader/core"
import type { EnhancerAPI as GesturesEnhancerAPI } from "@prose-reader/enhancer-gestures"
import { createContext } from "react"
import { type Signal, signal } from "reactjrx"
import { Subject } from "rxjs"
import type { ReaderNotification } from "../notifications/types"
import type {
  PROSE_REACT_READER_SETTINGS_SCOPE,
  PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE,
} from "../settings/types"

type PrivateContextType = {
  /**
   * Internal fallback values used for uncontrolled settings. This way the
   * Reader works as intended but:
   * - there are no persistent settings
   * - the settings are valid only for the current mount runtime
   */
  uncontrolledFontSize: number
  refitMenuOpen: boolean
  onRefitMenuOpenChange: (open: boolean) => void
  fontSizeMenuOpen: boolean
  onFontSizeMenuOpenChange: (open: boolean) => void
  notificationsSubject: Subject<ReaderNotification>
  quickMenuBottomBarBoundingBoxSignal: Signal<ResizeObserverEntry | undefined>
  fontSizeMin: number
  fontSizeMax: number
}

export type PublicContextType = {
  reader: (Reader & GesturesEnhancerAPI) | undefined
  enableFloatingTime?: boolean
  enableFloatingProgress?: boolean
  onItemClick?: (
    item:
      | "annotations"
      | "search"
      | "help"
      | "toc"
      | "bookmarks"
      | "more"
      | "back"
      | "gallery",
  ) => void
  quickMenuOpen: boolean
  onQuickMenuOpenChange: (open: boolean) => void
  fontSize?: number
  zoomMaxScale?: number
  onFontSizeChange?: (
    from: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE | "internal",
    value: number,
  ) => void
  fontSizeScope?: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE
  onFontSizeScopeChange?: (scope: PROSE_REACT_READER_SETTINGS_SCOPE) => void
  fontSizeValues?: Record<
    PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE,
    number | undefined
  >
}

export type ReaderContextType = PrivateContextType & PublicContextType

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

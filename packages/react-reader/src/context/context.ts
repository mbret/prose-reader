import type { Reader } from "@prose-reader/core"
import type {
  Annotation,
  RuntimeAnnotation,
} from "@prose-reader/enhancer-annotations"
import type { EnhancerAPI as GesturesEnhancerAPI } from "@prose-reader/enhancer-gestures"
import { createContext, type Dispatch, type SetStateAction } from "react"
import { type Signal, signal } from "reactjrx"
import { Subject } from "rxjs"
import type { ReaderNotification } from "../notifications/types"
import type {
  ManagedSettingName,
  ManagedSettingValues,
} from "../settings/managedSettings"
import type {
  PROSE_REACT_READER_SETTINGS_SCOPE,
  PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE,
} from "../settings/types"

export type PrivateContextType = {
  /**
   * react-reader's own values for the settings the app gives no value, starting
   * from the reader's. This way the Reader works as intended but:
   * - there are no persistent settings
   * - the settings are valid only for the current mount runtime
   */
  uncontrolledSettings: Partial<ManagedSettingValues>
  refitMenuOpen: boolean
  onRefitMenuOpenChange: (open: boolean) => void
  fontSizeMenuOpen: boolean
  onFontSizeMenuOpenChange: (open: boolean) => void
  notificationsSubject: Subject<ReaderNotification>
  quickMenuBottomBarBoundingBoxSignal: Signal<ResizeObserverEntry | undefined>
  fontSizeMin: number
  fontSizeMax: number
  _quickMenuOpen: boolean
  _onQuickMenuOpenChange: Dispatch<SetStateAction<boolean>>
  selectedHighlight:
    | {
        highlight?: RuntimeAnnotation
        selection?: {
          selection: Selection
          itemIndex: number
        }
      }
    | undefined
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
      | "gallery"
      | "layout",
  ) => void
  quickMenuOpen?: boolean
  onQuickMenuOpenChange?: Dispatch<SetStateAction<boolean>>
  zoomMaxScale?: number
  /**
   * The global values of the reader settings the user changes from
   * react-reader's menus. They apply unless `settingsScopes` points a setting
   * to another scope.
   */
  settings?: Partial<ManagedSettingValues>
  /**
   * The settings whose value the user chose in a menu, with the scope it was
   * chosen for, or `"internal"` for a value set on the reader directly.
   */
  onSettingsChange?: (
    changes: Partial<ManagedSettingValues>,
    from: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE | "internal",
  ) => void
  /** The values of the scopes other than the global one. */
  settingsByScope?: Partial<
    Record<
      Exclude<PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE, "global">,
      Partial<ManagedSettingValues>
    >
  >
  /**
   * For this book, the scope each setting takes its value from, when it is not
   * the global one. The menus offer the scopes once it is set.
   */
  settingsScopes?: Partial<
    Record<ManagedSettingName, PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE>
  >
  /** The scope the user picked for a setting, for this book. */
  onSettingsScopesChange?: (
    changes: Partial<
      Record<ManagedSettingName, PROSE_REACT_READER_SETTINGS_SCOPE>
    >,
  ) => void
  annotations?: Annotation[]
  onAnnotationCreate?: (annotation: Annotation) => void
  onAnnotationUpdate?: (
    annotation: Pick<Annotation, "id" | "highlightColor" | "notes">,
  ) => void
  onAnnotationDelete?: (id: string) => void
}

export type ReaderContextType = PrivateContextType & PublicContextType

export const getDefaultValue = (): ReaderContextType => ({
  _quickMenuOpen: false,
  _onQuickMenuOpenChange: (prev) => prev,
  reader: undefined,
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
  uncontrolledSettings: {},
  enableFloatingProgress: true,
  selectedHighlight: undefined,
})

export const ReaderContext = createContext(
  signal({ default: getDefaultValue() }),
)

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
  ReactReaderSettings,
} from "../settings/managedSettings"
import type {
  ReactReaderSettingsScope,
  ReactReaderSettingsScopeReference,
} from "../settings/types"

export type PrivateContextType = {
  /**
   * The value react-reader keeps for each scope: the last one picked in a menu
   * or set on the reader directly while the app gave none with that scope in
   * effect. The app's value for a scope hides it, and picking Default or Same
   * as global clears it. Lost on unmount, and the book scope's when the reader
   * changes.
   */
  uncontrolledSettingsByScope: Partial<
    Record<ReactReaderSettingsScopeReference, ReactReaderSettings>
  >
  refitMenuOpen: boolean
  onRefitMenuOpenChange: (open: boolean) => void
  fontSizeMenuOpen: boolean
  onFontSizeMenuOpenChange: (open: boolean) => void
  notificationsSubject: Subject<ReaderNotification>
  quickMenuBottomBarBoundingBoxSignal: Signal<ResizeObserverEntry | undefined>
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
      | "layout"
      | "theme",
  ) => void
  quickMenuOpen?: boolean
  onQuickMenuOpenChange?: Dispatch<SetStateAction<boolean>>
  zoomMaxScale?: number
  /**
   * The global values of the reader settings react-reader manages. They apply
   * unless `settingsScopes` points a setting to another scope.
   */
  settings?: ReactReaderSettings
  /**
   * The app's defaults for the settings react-reader manages: what a setting
   * takes when neither its scope in effect nor the global scope gives it a
   * value. They take precedence over `reader.settings.defaults`, and
   * react-reader never reports them.
   */
  defaultSettings?: ReactReaderSettings
  /**
   * The settings whose value the user chose in a menu, with the scope it was
   * chosen for, or `"internal"` for a value set on the reader directly. A
   * setting reported as `undefined` was set back to Default or Same as global:
   * that scope no longer has a value of its own.
   */
  onSettingsChange?: (
    changes: ReactReaderSettings,
    from: ReactReaderSettingsScopeReference | "internal",
  ) => void
  /** The values of the scopes other than the global one. */
  settingsByScope?: Partial<
    Record<
      Exclude<ReactReaderSettingsScopeReference, "global">,
      ReactReaderSettings
    >
  >
  /**
   * For this book, the scope each setting takes its value from, as
   * `onSettingsScopesChange` reports it. A setting it leaves out takes the
   * global value. The menus offer the scopes once it is set.
   */
  settingsScopes?: Partial<Record<ManagedSettingName, ReactReaderSettingsScope>>
  /**
   * The scope the user picked for a setting, for this book, to keep and pass
   * back in `settingsScopes`.
   */
  onSettingsScopesChange?: (
    changes: Partial<Record<ManagedSettingName, ReactReaderSettingsScope>>,
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
  uncontrolledSettingsByScope: {},
  enableFloatingProgress: true,
  selectedHighlight: undefined,
})

export const ReaderContext = createContext(
  signal({ default: getDefaultValue() }),
)

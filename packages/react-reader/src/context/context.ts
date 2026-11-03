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

/**
 * Declares the type of the reader you pass to `ReactReader`, so `useReader()`
 * returns it with the APIs of its enhancers. That reader needs the gestures
 * enhancer, or `useReader()` ignores the declaration:
 *
 * ```ts
 * declare module "@prose-reader/react-reader" {
 *   interface Register {
 *     reader: ReturnType<typeof createAppReader>
 *   }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noEmptyInterface: an app adds `reader` by declaration merging
export interface Register {}

type ReaderWithGestures = Reader & GesturesEnhancerAPI

/**
 * The reader `Register` declares, or a reader with the gestures enhancer when
 * `Register` declares none, or one without that enhancer.
 */
export type ReactReaderReader = Register extends {
  reader: infer RegisteredReader extends ReaderWithGestures
}
  ? RegisteredReader
  : ReaderWithGestures

export type PrivateContextType = {
  /**
   * react-reader's own values for the settings the app gives no value, starting
   * from the reader's. This way the Reader works as intended but:
   * - there are no persistent settings
   * - the settings are valid only for the current mount runtime
   */
  uncontrolledSettings: ReactReaderSettings
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
  reader: ReactReaderReader | undefined
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
   * The settings whose value the user chose in a menu, with the scope it was
   * chosen for, or `"internal"` for a value set on the reader directly.
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
  uncontrolledSettings: {},
  enableFloatingProgress: true,
  selectedHighlight: undefined,
})

export const ReaderContext = createContext(
  signal({ default: getDefaultValue() }),
)

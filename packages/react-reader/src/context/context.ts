import type { Reader } from "@prose-reader/core"
import type {
  Annotation,
  RuntimeAnnotation,
} from "@prose-reader/enhancer-annotations"
import type { EnhancerAPI as GesturesEnhancerAPI } from "@prose-reader/enhancer-gestures"
import { createContext } from "react"
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
   * react-reader's own values for the settings the app gives no value, starting
   * from the reader's. This way the Reader works as intended but:
   * - there are no persistent settings
   * - the settings are valid only for the current mount runtime
   */
  uncontrolledSettings: ReactReaderSettings
  notificationsSubject: Subject<ReaderNotification>
  quickMenuBottomBarBoundingBoxSignal: Signal<ResizeObserverEntry | undefined>
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

/**
 * Every key of `T`, for a write that replaces all of them: a prop the app
 * stops passing goes back to `undefined` instead of keeping its last value.
 */
export type EveryKeyOf<T> = {
  [Key in keyof Required<T>]: T[Key & keyof T] | undefined
}

export type ReaderContextType = PrivateContextType & PublicContextType

export const getDefaultValue = (): ReaderContextType => ({
  reader: undefined,
  quickMenuBottomBarBoundingBoxSignal: signal<ResizeObserverEntry | undefined>({
    default: undefined,
  }),
  notificationsSubject: new Subject<ReaderNotification>(),
  uncontrolledSettings: {},
  selectedHighlight: undefined,
})

export const ReaderContext = createContext(
  signal({ default: getDefaultValue() }),
)

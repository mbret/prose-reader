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

/**
 * Add `reader` to this interface to declare the type of the reader your
 * `createReader` returns. `useReader()` then returns a reader of that type,
 * with the APIs of its enhancers:
 *
 * ```ts
 * declare module "@prose-reader/react-reader" {
 *   interface Register {
 *     reader: ReturnType<typeof createAppReader>
 *   }
 * }
 * ```
 *
 * The reader needs the gestures enhancer. Without it, react-reader ignores
 * the declaration.
 */
// biome-ignore lint/suspicious/noEmptyInterface: an app adds `reader` by declaration merging
export interface Register {}

type ReaderWithGestures = Reader & GesturesEnhancerAPI

/**
 * The reader type that `Register` declares. If `Register` declares no reader,
 * or a reader without the gestures enhancer, it is a reader with the gestures
 * enhancer only.
 */
export type ReactReaderReader = Register extends {
  reader: infer RegisteredReader extends ReaderWithGestures | undefined
}
  ? NonNullable<RegisteredReader>
  : ReaderWithGestures

export type PrivateContextType = {
  reader: ReactReaderReader | undefined
  /** The element the view renders for the reader to mount in. */
  readerElement: HTMLElement | undefined
  /**
   * The value react-reader keeps for each scope: the last one picked in a menu
   * or set on the reader directly while the app gave none with that scope in
   * effect. The app's value for a scope hides it, and picking Default or Same
   * as global clears it. They last while the provider is mounted, and the book
   * scope's go when the provider destroys its reader.
   */
  uncontrolledSettingsByScope: Partial<
    Record<ReactReaderSettingsScopeReference, ReactReaderSettings>
  >
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

/** The props of `ReactReaderProvider` it copies into the context. */
export type ProviderContextType = {
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

export type ReaderContextType = PrivateContextType & ProviderContextType

export const getDefaultValue = (): ReaderContextType => ({
  reader: undefined,
  readerElement: undefined,
  quickMenuBottomBarBoundingBoxSignal: signal<ResizeObserverEntry | undefined>({
    default: undefined,
  }),
  notificationsSubject: new Subject<ReaderNotification>(),
  uncontrolledSettingsByScope: {},
  selectedHighlight: undefined,
})

export const ReaderContext = createContext<
  Signal<ReaderContextType> | undefined
>(undefined)

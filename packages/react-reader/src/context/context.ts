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
 * Declares the type of the reader your `createReader` returns, so
 * `useReader()` returns it with the APIs of its enhancers. That reader needs
 * the gestures enhancer, or `useReader()` ignores the declaration:
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

export type ViewStateContextType = {
  _quickMenuOpen: boolean
  _onQuickMenuOpenChange: Dispatch<SetStateAction<boolean>>
  fontSizeMenuOpen: boolean
  onFontSizeMenuOpenChange: (open: boolean) => void
  refitMenuOpen: boolean
  onRefitMenuOpenChange: (open: boolean) => void
}

export type PrivateContextType = ViewStateContextType & {
  reader: ReactReaderReader | undefined
  /** The element the view renders for the reader to mount in. */
  readerElement: HTMLElement | undefined
  /**
   * react-reader's own values for the settings the app gives no value. They
   * start from the first reader's values and go to every reader created after
   * it. They last while the provider is mounted, and nothing persists them.
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

/** The props of `ReactReaderProvider` it copies into the context. */
export type ProviderContextType = {
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

/** The props of `ReactReader` it copies into the context. */
export type ViewContextType = {
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
}

/**
 * Every key of `T`, for a write that replaces all of them: a prop the app
 * stops passing goes back to `undefined` instead of keeping its last value.
 */
export type EveryKeyOf<T> = {
  [Key in keyof Required<T>]: T[Key & keyof T] | undefined
}

export type ReaderContextType = PrivateContextType &
  ProviderContextType &
  ViewContextType

export const getDefaultValue = (): ReaderContextType => ({
  _quickMenuOpen: false,
  _onQuickMenuOpenChange: (prev) => prev,
  reader: undefined,
  readerElement: undefined,
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

export const ReaderContext = createContext<
  Signal<ReaderContextType> | undefined
>(undefined)

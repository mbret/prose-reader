import type { ReaderContextType } from "../context/context"
import type {
  ManagedSettingName,
  ManagedSettingValues,
  ReactReaderSettings,
} from "./managedSettings"
import type {
  ReactReaderSettingsScopeReference,
  ScreenSettingsScopeReference,
} from "./types"

/**
 * Where the values of the settings react-reader manages come from, before the
 * reader's own defaults.
 */
type ManagedSettingSources = Pick<
  ReaderContextType,
  | "settings"
  | "settingsByScope"
  | "settingsScopes"
  | "defaultSettings"
  | "uncontrolledSettingsByScope"
>

type ReaderDefaultSettingValues = ManagedSettingValues | undefined

/** The value the app gives a setting for a scope, if it gives one. */
const getAppSettingValueForScope = <Name extends ManagedSettingName>(
  { settings, settingsByScope }: ManagedSettingSources,
  name: Name,
  scope: ReactReaderSettingsScopeReference,
): ManagedSettingValues[Name] | undefined =>
  scope === "global" ? settings?.[name] : settingsByScope?.[scope]?.[name]

/**
 * The scope a setting takes its value from for this book, as the screen it
 * stands for when it is the screen scope.
 */
export const getSettingScopeReferenceInEffect = (
  { settingsScopes }: Pick<ManagedSettingSources, "settingsScopes">,
  name: ManagedSettingName,
  screen: ScreenSettingsScopeReference,
): ReactReaderSettingsScopeReference => {
  const scope = settingsScopes?.[name] ?? "global"

  return scope === "screen" ? screen : scope
}

/**
 * The value the app gives a setting when a scope is in effect: the scope's, or
 * the global one when the scope has none.
 */
export const getAppSettingValueWhenScopeInEffect = <
  Name extends ManagedSettingName,
>(
  sources: ManagedSettingSources,
  name: Name,
  scope: ReactReaderSettingsScopeReference,
): ManagedSettingValues[Name] | undefined =>
  getAppSettingValueForScope(sources, name, scope) ?? sources.settings?.[name]

/**
 * A scope's own value for a setting: the app's, or react-reader's own when the
 * app gives none. `undefined` when the scope takes the value it inherits.
 */
export const getOwnSettingValueForScope = <Name extends ManagedSettingName>(
  sources: ManagedSettingSources,
  name: Name,
  scope: ReactReaderSettingsScopeReference,
): ManagedSettingValues[Name] | undefined =>
  getAppSettingValueForScope(sources, name, scope) ??
  sources.uncontrolledSettingsByScope[scope]?.[name]

/**
 * The value a scope without its own takes: the global scope's for every other
 * scope, and for the global scope the app's default, then the reader's.
 */
export const getInheritedSettingValueForScope = <
  Name extends ManagedSettingName,
>(
  sources: ManagedSettingSources,
  name: Name,
  scope: ReactReaderSettingsScopeReference,
  readerDefaultSettingValues: ReaderDefaultSettingValues,
): ManagedSettingValues[Name] | undefined =>
  scope === "global"
    ? (sources.defaultSettings?.[name] ?? readerDefaultSettingValues?.[name])
    : getSettingValueForScope(
        sources,
        name,
        "global",
        readerDefaultSettingValues,
      )

/**
 * The value a setting takes when a scope is in effect: the scope's own, or the
 * one it inherits.
 */
export const getSettingValueForScope = <Name extends ManagedSettingName>(
  sources: ManagedSettingSources,
  name: Name,
  scope: ReactReaderSettingsScopeReference,
  readerDefaultSettingValues: ReaderDefaultSettingValues,
): ManagedSettingValues[Name] | undefined =>
  getOwnSettingValueForScope(sources, name, scope) ??
  getInheritedSettingValueForScope(
    sources,
    name,
    scope,
    readerDefaultSettingValues,
  )

/** The context with `changes` laid over react-reader's own values for a scope. */
export const withUncontrolledSettingChangesForScope =
  (scope: ReactReaderSettingsScopeReference, changes: ReactReaderSettings) =>
  (context: ReaderContextType): ReaderContextType => ({
    ...context,
    uncontrolledSettingsByScope: {
      ...context.uncontrolledSettingsByScope,
      [scope]: { ...context.uncontrolledSettingsByScope[scope], ...changes },
    },
  })

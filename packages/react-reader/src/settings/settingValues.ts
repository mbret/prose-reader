import type { Signal } from "reactjrx"
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

export const MANAGED_SETTING_SOURCE_KEYS = [
  "reader",
  "settings",
  "settingsByScope",
  "settingsScopes",
  "defaultSettings",
  "uncontrolledSettingsByScope",
] as const satisfies (keyof ReaderContextType)[]

type ManagedSettingSources = Pick<
  ReaderContextType,
  (typeof MANAGED_SETTING_SOURCE_KEYS)[number]
>

/** The value the app gives a setting for a scope, if it gives one. */
const getAppSettingValueForScope = <Name extends ManagedSettingName>(
  {
    settings,
    settingsByScope,
  }: Pick<ManagedSettingSources, "settings" | "settingsByScope">,
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
 * A setting's values for a scope:
 * - `ownValue`: the app's, or else react-reader's uncontrolled one;
 *   `undefined` when the scope takes the value it inherits.
 * - `inheritedValue`: the global scope's value for the other scopes, and for
 *   the global scope `defaultSettings`, then the reader's default.
 * - `appliedValue`: the value the setting takes when the scope is in effect.
 */
export const getManagedSettingValuesForScope = <
  Name extends ManagedSettingName,
>(
  sources: ManagedSettingSources,
  name: Name,
  scope: ReactReaderSettingsScopeReference,
) => {
  const readerDefaultSettingValues: ManagedSettingValues | undefined =
    sources.reader?.settings.defaults
  const getOwnValueOfScope = (
    ownerScope: ReactReaderSettingsScopeReference,
  ): ManagedSettingValues[Name] | undefined =>
    getAppSettingValueForScope(sources, name, ownerScope) ??
    sources.uncontrolledSettingsByScope[ownerScope]?.[name]
  const defaultValue =
    sources.defaultSettings?.[name] ?? readerDefaultSettingValues?.[name]
  const ownValue = getOwnValueOfScope(scope)
  const inheritedValue =
    scope === "global"
      ? defaultValue
      : (getOwnValueOfScope("global") ?? defaultValue)

  return { ownValue, inheritedValue, appliedValue: ownValue ?? inheritedValue }
}

/**
 * Reports a setting's value, picked for a scope or set on the reader directly
 * (`"internal"`), and keeps it as that scope's uncontrolled value while the app
 * gives none with the scope in effect, its own or the global one. `undefined`
 * sets the scope back to the value it inherits, and always clears its
 * uncontrolled value.
 */
export const changeManagedSettingValue = <Name extends ManagedSettingName>(
  context: Signal<ReaderContextType>,
  name: Name,
  scope: ReactReaderSettingsScopeReference,
  value: ManagedSettingValues[Name] | undefined,
  from: ReactReaderSettingsScopeReference | "internal",
) => {
  const changes: ReactReaderSettings = {}
  const isInheritedValuePicked = value === undefined
  const hasAppValueWithScopeInEffect =
    (getAppSettingValueForScope(context.value, name, scope) ??
      context.value.settings?.[name]) !== undefined

  changes[name] = value

  if (isInheritedValuePicked || !hasAppValueWithScopeInEffect) {
    context.update((old) => ({
      ...old,
      uncontrolledSettingsByScope: {
        ...old.uncontrolledSettingsByScope,
        [scope]: { ...old.uncontrolledSettingsByScope[scope], ...changes },
      },
    }))
  }

  context.value.onSettingsChange?.(changes, from)
}

/**
 * The uncontrolled values that still hold with `reader`: the book scope's go
 * with the reader that showed the book.
 */
export const getUncontrolledSettingsByScopeForReader = (
  context: ReaderContextType,
  reader: ReaderContextType["reader"],
): ReaderContextType["uncontrolledSettingsByScope"] =>
  context.reader === reader
    ? context.uncontrolledSettingsByScope
    : { ...context.uncontrolledSettingsByScope, book: undefined }

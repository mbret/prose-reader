import type { PublicContextType } from "../context/context"
import type {
  ManagedSettingName,
  ManagedSettingValues,
} from "./managedSettings"
import type {
  ReactReaderSettingsScopeReference,
  ScreenSettingsScopeReference,
} from "./types"

type AppSettingValues = Pick<
  PublicContextType,
  "settings" | "settingsByScope" | "settingsScopes"
>

/** The value the app gives a setting for a scope, if it gives one. */
const getAppSettingValueForScope = <Name extends ManagedSettingName>(
  { settings, settingsByScope }: AppSettingValues,
  name: Name,
  scope: ReactReaderSettingsScopeReference,
): ManagedSettingValues[Name] | undefined =>
  scope === "global" ? settings?.[name] : settingsByScope?.[scope]?.[name]

/**
 * The scope a setting takes its value from for this book, as the screen it
 * stands for when it is the screen scope.
 */
export const getSettingScopeReferenceInEffect = (
  { settingsScopes }: AppSettingValues,
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
  appSettingValues: AppSettingValues,
  name: Name,
  scope: ReactReaderSettingsScopeReference,
): ManagedSettingValues[Name] | undefined =>
  getAppSettingValueForScope(appSettingValues, name, scope) ??
  appSettingValues.settings?.[name]

/** The value the app gives a setting for this book, on this screen. */
export const getAppSettingValueInEffect = <Name extends ManagedSettingName>(
  appSettingValues: AppSettingValues,
  name: Name,
  screen: ScreenSettingsScopeReference,
): ManagedSettingValues[Name] | undefined =>
  getAppSettingValueWhenScopeInEffect(
    appSettingValues,
    name,
    getSettingScopeReferenceInEffect(appSettingValues, name, screen),
  )

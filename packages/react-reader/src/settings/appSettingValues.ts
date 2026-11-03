import type { PrivateContextType, PublicContextType } from "../context/context"
import {
  MANAGED_SETTING_NAMES,
  type ManagedSettingName,
  type ManagedSettingValues,
  type ReactReaderSettings,
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

type ManagedSettingSources = AppSettingValues &
  Pick<PrivateContextType, "uncontrolledSettings">

/**
 * The value a setting takes for this book, on this screen: the app's, or
 * react-reader's own when the app gives none.
 */
export const getManagedSettingValueInEffect = <Name extends ManagedSettingName>(
  sources: ManagedSettingSources,
  name: Name,
  screen: ScreenSettingsScopeReference,
): ManagedSettingValues[Name] | undefined =>
  getAppSettingValueInEffect(sources, name, screen) ??
  sources.uncontrolledSettings[name]

/**
 * The values the settings react-reader manages take for this book, on this
 * screen. A setting with no value is left out.
 */
export const getManagedSettingValuesInEffect = (
  sources: ManagedSettingSources,
  screen: ScreenSettingsScopeReference,
): ReactReaderSettings => {
  const valuesInEffect: ReactReaderSettings = {}

  const addValueInEffect = <Name extends ManagedSettingName>(name: Name) => {
    const valueInEffect = getManagedSettingValueInEffect(sources, name, screen)

    if (valueInEffect !== undefined) valuesInEffect[name] = valueInEffect
  }

  MANAGED_SETTING_NAMES.forEach(addValueInEffect)

  return valuesInEffect
}

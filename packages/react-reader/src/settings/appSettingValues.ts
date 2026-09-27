import type { PublicContextType } from "../context/context"
import type {
  ManagedSettingName,
  ManagedSettingValues,
} from "./managedSettings"
import type { PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE } from "./types"

type AppSettingValues = Pick<
  PublicContextType,
  "settings" | "settingsByScope" | "settingsScopes"
>

/** The value the app gives a setting for a scope, if it gives one. */
export const getAppSettingValueForScope = <Name extends ManagedSettingName>(
  { settings, settingsByScope }: AppSettingValues,
  name: Name,
  scope: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE,
): ManagedSettingValues[Name] | undefined =>
  scope === "global" ? settings?.[name] : settingsByScope?.[scope]?.[name]

/** The scope a setting takes its value from, for this book. */
export const getSettingScopeInEffect = (
  { settingsScopes }: AppSettingValues,
  name: ManagedSettingName,
): PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE =>
  settingsScopes?.[name] ?? "global"

/**
 * The value the app gives a setting for this book: its scope's, or the global
 * one when its scope has none.
 */
export const getAppSettingValueInEffect = <Name extends ManagedSettingName>(
  appSettingValues: AppSettingValues,
  name: Name,
): ManagedSettingValues[Name] | undefined =>
  getAppSettingValueForScope(
    appSettingValues,
    name,
    getSettingScopeInEffect(appSettingValues, name),
  ) ?? appSettingValues.settings?.[name]

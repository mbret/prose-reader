import type { Reader } from "@prose-reader/core"

/**
 * The reader settings react-reader manages, by their name in
 * `reader.settings`: the ones the user changes from its menus, and the theme,
 * which the app sets. A name added here is taken by the settings props, synced
 * with the reader and kept by react-reader when the app gives it no value; a
 * menu for it is the only code left to write.
 */
export const MANAGED_SETTING_NAMES = [
  "fontScale",
  "spreadMode",
  "theme",
] as const

export type ManagedSettingName = (typeof MANAGED_SETTING_NAMES)[number]

export type ManagedSettingValues = Pick<
  Reader["settings"]["values"],
  ManagedSettingName
>

/**
 * Values of the settings react-reader manages, in the shape `reader.settings`
 * has: what `settings` and `settingsByScope` hold, and what `onSettingsChange`
 * reports.
 */
export type ReactReaderSettings = Partial<ManagedSettingValues>

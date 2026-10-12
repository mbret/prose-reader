import type { Reader } from "@prose-reader/core"

/**
 * The reader settings the user changes from react-reader's menus, by their
 * name in `reader.settings`. A name added here is taken by the settings props,
 * synced with the reader and kept by react-reader when the app gives it no
 * value; its menu is the only code left to write.
 */
export const MANAGED_SETTING_NAMES = ["fontScale", "spreadMode"] as const

export type ManagedSettingName = (typeof MANAGED_SETTING_NAMES)[number]

export type ManagedSettingValues = Pick<
  Reader["settings"]["values"],
  ManagedSettingName
>

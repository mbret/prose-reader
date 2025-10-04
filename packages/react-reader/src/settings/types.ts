export type SETTING_SCOPE = "book" | "device" | "global"
export type SETTING_SCOPE_REFERENCE =
  | "book"
  | "global"
  | "mobile"
  | "tablet"
  | "desktop"

export const SETTINGS_SCOPES: SETTING_SCOPE[] = ["global", "book", "device"]
export const SETTINGS_SCOPES_REFERENCES: SETTING_SCOPE_REFERENCE[] = [
  "global",
  "book",
  "mobile",
  "tablet",
  "desktop",
]
export const SCOPE_DEVICE_MOBILE_QUERY = "(max-width: 767px)"
export const SCOPE_DEVICE_TABLET_QUERY = "(max-width: 1023px)"

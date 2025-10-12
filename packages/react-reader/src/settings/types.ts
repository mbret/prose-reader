export const PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION = [
  {
    value: "global",
    references: ["global"],
  },
  {
    value: "book",
    references: ["book"],
  },
  {
    value: "screen",
    references: ["mobile", "tablet", "desktop"],
  },
] as const
export type PROSE_REACT_READER_SETTINGS_SCOPE =
  (typeof PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION)[number]["value"]
export type PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE =
  (typeof PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION)[number]["references"][number]

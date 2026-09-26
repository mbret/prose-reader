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

export const SETTINGS_SCOPES =
  PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION.map((scope) => scope.value)

export const SETTINGS_SCOPE_REFERENCES =
  PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION.flatMap(
    (scope) => scope.references,
  )

export const isSettingsScope = (
  value: string,
): value is PROSE_REACT_READER_SETTINGS_SCOPE =>
  SETTINGS_SCOPES.some((scope) => scope === value)

export const isSettingsScopeReference = (
  value: string,
): value is PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE =>
  SETTINGS_SCOPE_REFERENCES.some((reference) => reference === value)

/** The scope a reference belongs to, such as `screen` for `tablet`. */
export const getScopeForReference = (
  reference: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE | undefined,
) =>
  PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION.find(
    function holdsReference(scope) {
      const scopeReferences: readonly string[] = scope.references

      return reference !== undefined && scopeReferences.includes(reference)
    },
  )?.value

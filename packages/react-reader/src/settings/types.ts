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
/**
 * Where a setting takes its value from, for a book: the global value, the
 * book's own, or the one of the screen it is read on.
 */
export type ReactReaderSettingsScope =
  (typeof PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION)[number]["value"]
/**
 * A scope with the screen it stands for: the global and book scopes, or one
 * screen of the screen scope, `mobile`, `tablet` or `desktop`.
 */
export type ReactReaderSettingsScopeReference =
  (typeof PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION)[number]["references"][number]

export const SETTINGS_SCOPES =
  PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION.map((scope) => scope.value)

export const SETTINGS_SCOPE_REFERENCES =
  PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION.flatMap(
    (scope) => scope.references,
  )

export const isSettingsScope = (
  value: string,
): value is ReactReaderSettingsScope =>
  SETTINGS_SCOPES.some((scope) => scope === value)

export const isSettingsScopeReference = (
  value: string,
): value is ReactReaderSettingsScopeReference =>
  SETTINGS_SCOPE_REFERENCES.some((reference) => reference === value)

/** The scope a reference belongs to, such as `screen` for `tablet`. */
export const getScopeForReference = (
  reference: ReactReaderSettingsScopeReference | undefined,
) =>
  PROSE_REACT_READER_SETTINGS_SCOPE_CONFIGURATION.find(
    function holdsReference(scope) {
      const scopeReferences: readonly string[] = scope.references

      return reference !== undefined && scopeReferences.includes(reference)
    },
  )?.value

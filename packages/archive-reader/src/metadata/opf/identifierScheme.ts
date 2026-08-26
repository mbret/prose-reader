/**
 * How an OPF states a `dc:identifier`'s scheme. Both halves are facts about
 * what a package document can say, so the parser and the resolver read them
 * from here rather than each spelling them out.
 */

/**
 * Attribute names an identifier's scheme can be stated on, in the order a read
 * prefers them: EPUB 3's namespaced form, the capitalization some producers
 * emit, and the bare EPUB 2 form. The first one present wins, so a document
 * that uses only the legacy spelling keeps it.
 */
export const OPF_IDENTIFIER_SCHEME_ATTRIBUTES = [
  "opf:scheme",
  "opf:Scheme",
  "scheme",
] as const

/**
 * ONIX codelist 5 codes, which is the list an `identifier-type` refinement
 * states its value against when it names `onix:codelist5` as its scheme.
 */
const ONIX_CODE_LIST_5_IDENTIFIER_TYPES: Readonly<Record<string, string>> = {
  "02": "ISBN",
  "03": "GTIN",
  "04": "UPC",
  "05": "ISMN",
  "06": "DOI",
  "13": "LCCN",
  "14": "GTIN",
  "15": "ISBN",
  "22": "URN",
  "23": "OCLC",
  "24": "ISBN",
  "25": "ISMN",
  "26": "DOI",
  "34": "GTIN",
  "35": "ARK",
}

/** The `<meta>` fields an identifier's type is read from. */
export type OpfIdentifierTypeMeta = {
  readonly value?: string
  readonly scheme?: string
}

/**
 * The scheme an EPUB 3 `identifier-type` refinement names. A value stated
 * against `onix:codelist5` is a code from that list — `15` is an ISBN — and is
 * translated; a code the list does not define, and any value stated against
 * another scheme or none, is already a scheme name and passes through
 * verbatim.
 */
export const opfIdentifierTypeScheme = (
  meta: OpfIdentifierTypeMeta | undefined,
): string | undefined => {
  const value = meta?.value?.trim()

  if (value === undefined || value.length === 0) return undefined
  if (meta?.scheme?.trim().toLowerCase() !== "onix:codelist5") return value

  return ONIX_CODE_LIST_5_IDENTIFIER_TYPES[value] ?? value
}

/**
 * The scheme attribute an element carries, if any — the first spelling of
 * {@link OPF_IDENTIFIER_SCHEME_ATTRIBUTES} it states.
 */
export const opfIdentifierSchemeAttribute = (
  attributes: Readonly<Record<string, string | undefined>>,
): string | undefined => {
  for (const name of OPF_IDENTIFIER_SCHEME_ATTRIBUTES) {
    const value = attributes[name]

    if (value !== undefined) return value
  }

  return undefined
}

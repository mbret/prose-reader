/** One URI path character, per RFC 3986: what a URN's parts are made of. */
const URI_PATH_CHARACTER = "(?:[a-z0-9._~!$&'()*+,;=:@-]|%[0-9a-f]{2})"

/**
 * A URN, per RFC 8141: `urn:`, a namespace identifier of 2 to 32 letters,
 * digits and inner hyphens, a namespace-specific string of URI path
 * characters, and the optional `?+`, `?=` and `#` components.
 */
const URN_PATTERN = new RegExp(
  `^urn:([a-z0-9][a-z0-9-]{0,30}[a-z0-9])` +
    `:(${URI_PATH_CHARACTER}(?:${URI_PATH_CHARACTER}|/)*)` +
    `(?:\\?\\+${URI_PATH_CHARACTER}(?:${URI_PATH_CHARACTER}|[/?])*)?` +
    `(?:\\?=${URI_PATH_CHARACTER}(?:${URI_PATH_CHARACTER}|[/?])*)?` +
    `(?:#(?:${URI_PATH_CHARACTER}|[/?])*)?$`,
  "i",
)

/** The two parts that say which name a URN is. */
export type ParsedUrn = {
  /**
   * The namespace identifier, `nbn` in `urn:nbn:de:101:1-2011`, in lower
   * case: RFC 8141 does not distinguish its case.
   */
  readonly namespaceIdentifier: string
  /**
   * The namespace-specific string, `de:101:1-2011`, as written: whether its
   * case matters is for the namespace to define.
   */
  readonly namespaceSpecificString: string
}

/**
 * The namespace a URN names and its name in that namespace, or `undefined`
 * when RFC 8141 does not allow the value. The optional `?+`, `?=` and `#`
 * components are checked and left out: RFC 8141 does not count them when it
 * compares two URNs.
 */
export const parseUrn = (value: string): ParsedUrn | undefined => {
  const [, namespaceIdentifier, namespaceSpecificString] =
    URN_PATTERN.exec(value.trim()) ?? []

  return namespaceIdentifier !== undefined &&
    namespaceSpecificString !== undefined
    ? {
        namespaceIdentifier: namespaceIdentifier.toLowerCase(),
        namespaceSpecificString,
      }
    : undefined
}

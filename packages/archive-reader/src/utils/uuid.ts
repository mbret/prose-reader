import { parseUrn } from "./urn.ts"

/** A UUID's text form, per RFC 9562: 32 hex digits grouped 8-4-4-4-12. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * A bare UUID in the lower case RFC 9562 writes it in, since it reads the hex
 * digits in either case, or `undefined` when the value is not one.
 */
export const canonicalUuid = (value: string): string | undefined => {
  const trimmed = value.trim()

  return UUID_PATTERN.test(trimmed) ? trimmed.toLowerCase() : undefined
}

/** The UUID a `urn:uuid:` URN names, canonicalized like {@link canonicalUuid}. */
export const uuidFromUrn = (value: string): string | undefined => {
  const urn = parseUrn(value)

  return urn?.namespaceIdentifier === "uuid"
    ? canonicalUuid(urn.namespaceSpecificString)
    : undefined
}

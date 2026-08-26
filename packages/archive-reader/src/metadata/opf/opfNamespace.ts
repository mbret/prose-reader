/** The OPF namespace every package document's own vocabulary lives in. */
export const OPF_NAMESPACE = "http://www.idpf.org/2007/opf"

/** The conventional prefix, accepted even when a package never declares it. */
const CONVENTIONAL_OPF_PREFIX = "opf"

const XMLNS_PREFIX = "xmlns:"

/**
 * The prefix bindings in force at one element: every `xmlns:*` declaration on
 * it and on its ancestors, nearest winning. XML scopes bindings per element, so
 * a descendant can introduce a prefix its ancestors never had and rebind one
 * they did.
 */
export type XmlNamespaceScope = Readonly<Record<string, string>>

/**
 * The scope at an element, given the one its parent was read under. Call it
 * while descending so each element is read under its own bindings.
 */
export const xmlNamespaceScope = (
  attributes: Readonly<Record<string, string | undefined>>,
  inherited: XmlNamespaceScope = {},
): XmlNamespaceScope => {
  let scope: Record<string, string> | undefined

  for (const [name, value] of Object.entries(attributes)) {
    if (!name.startsWith(XMLNS_PREFIX)) continue

    const prefix = name.slice(XMLNS_PREFIX.length)
    const namespace = value?.trim()

    if (prefix.length === 0 || namespace === undefined) continue

    scope ??= { ...inherited }
    scope[prefix] = namespace
  }

  return scope ?? inherited
}

/**
 * The prefixes naming the OPF namespace in a scope. The conventional `opf` is
 * included unless the document bound it to something else, since using it
 * undeclared is invalid but common — a rebinding is explicit and is honoured.
 */
export const opfNamespacePrefixes = (
  scope: XmlNamespaceScope,
): ReadonlyArray<string> => {
  const prefixes = Object.keys(scope).filter(function namesOpf(prefix) {
    return scope[prefix] === OPF_NAMESPACE
  })

  return scope[CONVENTIONAL_OPF_PREFIX] === undefined
    ? [CONVENTIONAL_OPF_PREFIX, ...prefixes]
    : prefixes
}

/**
 * An attribute in the OPF namespace, tried under every prefix naming it before
 * the unprefixed spelling EPUB 2 documents use. An unprefixed attribute is in
 * no namespace at all, so that is a deliberate fallback rather than an
 * equivalent name.
 */
export const opfNamespacedAttribute = (
  attributes: Readonly<Record<string, string | undefined>>,
  prefixes: ReadonlyArray<string>,
  localNames: ReadonlyArray<string>,
): string | undefined => {
  for (const localName of localNames) {
    for (const prefix of prefixes) {
      const value = attributes[`${prefix}:${localName}`]

      if (value !== undefined) return value
    }
  }

  for (const localName of localNames) {
    const value = attributes[localName]

    if (value !== undefined) return value
  }

  return undefined
}

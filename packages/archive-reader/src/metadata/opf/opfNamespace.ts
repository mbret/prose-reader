import type { XmlNamespaceScope } from "../../utils/xmlNamespaceScope.ts"

/** The OPF namespace every package document's own vocabulary lives in. */
export const OPF_NAMESPACE = "http://www.idpf.org/2007/opf"

/** The conventional prefix, accepted even when a package never declares it. */
const CONVENTIONAL_OPF_PREFIX = "opf"

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

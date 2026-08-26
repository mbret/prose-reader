/** The OPF namespace every package document's own vocabulary lives in. */
export const OPF_NAMESPACE = "http://www.idpf.org/2007/opf"

const XMLNS_PREFIX = "xmlns:"

/**
 * The prefixes a document binds to the OPF namespace. `opf` is the convention
 * and is always accepted — a package using it without declaring `xmlns:opf` is
 * invalid but common — while any other prefix bound to the namespace names the
 * same attributes and is read alongside it.
 */
export const opfNamespacePrefixes = (
  rootAttributes: Readonly<Record<string, string | undefined>>,
): ReadonlyArray<string> => {
  const prefixes = new Set<string>(["opf"])

  for (const [name, value] of Object.entries(rootAttributes)) {
    if (!name.startsWith(XMLNS_PREFIX)) continue
    if (value?.trim() !== OPF_NAMESPACE) continue

    const prefix = name.slice(XMLNS_PREFIX.length)

    if (prefix.length > 0) prefixes.add(prefix)
  }

  return [...prefixes]
}

/**
 * An attribute in the OPF namespace, tried under every prefix the document
 * bound to it before the unprefixed spelling EPUB 2 documents use. An
 * unprefixed attribute is in no namespace at all, so it is a deliberate
 * fallback rather than an equivalent name.
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

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

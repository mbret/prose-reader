import { XmlDocument } from "xmldoc"

export const KOBO_DISPLAY_OPTIONS_FILENAME = "com.kobobooks.display-options.xml"

/**
 * Normalized fields from Kobo-specific XML sidecars. Grows as new Kobo
 * document kinds are supported; absent keys mean not present or unknown.
 */
export type KoboMetadata = {
  readonly kind: "kobo"
  renditionLayout?: `reflowable` | `pre-paginated`
}

const parseKoboDisplayOptionsDocument = (
  doc: XmlDocument,
): { renditionLayout?: "pre-paginated" } => {
  const platform = doc.childNamed("platform")
  if (!platform) return {}

  for (const option of platform.childrenNamed("option")) {
    if (option.attr?.name !== "fixed-layout") continue
    if (option.val.trim().toLowerCase() === "true") {
      return { renditionLayout: "pre-paginated" }
    }
    return {}
  }

  return {}
}

/**
 * Parse a Kobo-related XML document. Unsupported or unrecognized roots
 * yield an empty object. Malformed XML throws from the underlying parser.
 */
export const parseKoboXml = (xml: string): KoboMetadata => {
  const doc = new XmlDocument(xml)
  const root = doc.name?.toLowerCase()

  if (root === "display_options") {
    return { kind: "kobo", ...parseKoboDisplayOptionsDocument(doc) }
  }

  return { kind: "kobo" }
}

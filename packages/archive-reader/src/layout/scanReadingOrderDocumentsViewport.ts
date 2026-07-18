import { isXmlBasedMimeType } from "@prose-reader/shared"
import { XmlDocument } from "xmldoc"
import { readRecordAsText } from "../archives/readRecordAsText"
import type { Archive } from "../archives/types"
import { getArchiveFileRecordByUri, isFileRecord } from "../archives/types"
import type { ArchiveReadingOrderItem } from "../readingOrder/resolveArchiveReadingOrder"
import { Report } from "../report"

const hasDocMetaViewport = (doc: XmlDocument) => {
  const metaElm = doc
    .descendantWithPath("head")
    ?.childrenNamed("meta")
    .find((node) => node.attr.name === "viewport")

  return !!(metaElm && metaElm.attr.name === "viewport")
}

/**
 * The industry heuristic behind the `layoutScan` effort modifier: many
 * fixed-layout books in the wild declare `rendition:layout` reflowable (or
 * nothing) while every spine document carries a `head > meta[name=viewport]`
 * — the fixed-layout signal renderers actually honor.
 *
 * Returns `true` only when EVERY reading-order document is XML-based
 * (by media type or extension) AND declares a viewport; any non-XML entry
 * (an image in the spine…) or viewport-less document returns `false`.
 * A document that fails to read or parse also returns `false` (logged via
 * Report) — an unreadable book must never be promoted.
 *
 * **Cost: O(reading order)** — reads and XML-parses every document. This is
 * the expensive tier of archive resolution; keep it opt-in.
 */
export const readingOrderDocumentsAllHaveViewport = async (
  archive: Archive,
  readingOrder: ReadonlyArray<ArchiveReadingOrderItem>,
): Promise<boolean> => {
  if (readingOrder.length === 0) return false

  for (const item of readingOrder) {
    if (!isXmlBasedMimeType({ mimeType: item.mediaType, uri: item.uri })) {
      return false
    }

    const record = getArchiveFileRecordByUri(archive, item.uri)

    if (!record || !isFileRecord(record)) return false

    try {
      const content = await readRecordAsText(record)

      if (!hasDocMetaViewport(new XmlDocument(content))) return false
    } catch (e) {
      Report.error(`layout scan: unable to inspect ${item.uri}`, e)

      return false
    }
  }

  return true
}

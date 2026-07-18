import { readRecordAsText } from "../archives/readRecordAsText"
import type { Archive, FileRecord } from "../archives/types"
import { isFileRecord } from "../archives/types"
import {
  APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME,
  type AppleMetadata,
  parseAppleDisplayOptionsXml,
} from "./parse"

const appleDisplayOptionsBasenameLower =
  APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME.toLowerCase()

/**
 * Loads and parses the Apple iBooks display options sidecar
 * (`META-INF/com.apple.ibooks.display-options.xml`) from `archive`.
 *
 * Returns `undefined` when the archive has no such file (matched on
 * basename, ASCII case-insensitive, anywhere in the container). Malformed
 * XML throws — lenient callers own the catch.
 */
export async function readArchiveApple(
  archive: Archive,
): Promise<AppleMetadata | undefined> {
  const record = archive.records.find(
    (file): file is FileRecord =>
      isFileRecord(file) &&
      file.basename.toLowerCase() === appleDisplayOptionsBasenameLower,
  )

  if (!record) {
    return undefined
  }

  return parseAppleDisplayOptionsXml(await readRecordAsText(record))
}

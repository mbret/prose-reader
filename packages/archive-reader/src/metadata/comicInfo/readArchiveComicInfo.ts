import { readRecordAsText } from "../../archives/readRecordAsText.ts"
import type { Archive } from "../../archives/types.ts"
import { getArchiveHasComicInfo } from "./getArchiveHasComicInfo.ts"
import { type ComicInfo, parseComicInfo } from "./parse.ts"

/**
 * Loads and parses the `ComicInfo.xml` sidecar from `archive`.
 *
 * Returns `undefined` when the archive has no ComicInfo file (matched on
 * basename, ASCII case-insensitive, anywhere in the container). Malformed
 * XML throws, same as {@link parseComicInfo} — lenient callers (a whole
 * archive resolve that treats books in the wild as dirty) own the catch.
 */
export async function readArchiveComicInfo(
  archive: Archive,
): Promise<ComicInfo | undefined> {
  const record = getArchiveHasComicInfo(archive)

  if (!record) {
    return undefined
  }

  return parseComicInfo(await readRecordAsText(record))
}

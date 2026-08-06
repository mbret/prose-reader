import { readRecordAsText } from "../../archives/readRecordAsText.ts"
import type { Archive, FileRecord } from "../../archives/types.ts"
import { isFileRecord } from "../../archives/types.ts"
import { Report } from "../../report.ts"
import {
  KOBO_DISPLAY_OPTIONS_FILENAME,
  type KoboMetadata,
  parseKoboXml,
} from "./parse.ts"

/**
 * Loads and parses Kobo XML sidecars (`com.kobobooks.display-options.xml`)
 * from `archive`, merging them into a single {@link KoboMetadata}.
 *
 * Files are matched anywhere in the container (`uri` suffix). When several
 * match, they are read in record order and the last parsed value for a field
 * wins. A file that fails to parse is skipped (logged via Report) — per-file
 * resilience is part of the merge semantics, unlike the single-file readers
 * which throw. Returns `undefined` when no Kobo file is found.
 */
export async function readArchiveKobo(
  archive: Archive,
): Promise<KoboMetadata | undefined> {
  const records = archive.records.filter(
    (file): file is FileRecord =>
      isFileRecord(file) && file.uri.endsWith(KOBO_DISPLAY_OPTIONS_FILENAME),
  )

  if (records.length === 0) {
    return undefined
  }

  let renditionLayout: KoboMetadata["renditionLayout"]

  for (const record of records) {
    const content = await readRecordAsText(record)

    try {
      const { renditionLayout: layout } = parseKoboXml(content)
      if (layout) renditionLayout = layout
    } catch (e) {
      Report.error(
        `Unable to parse ${KOBO_DISPLAY_OPTIONS_FILENAME} (${record.uri})`,
        e,
      )
    }
  }

  return {
    kind: `kobo`,
    ...(renditionLayout !== undefined ? { renditionLayout } : {}),
  }
}

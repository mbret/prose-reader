import { getUriBasePath } from "@prose-reader/shared"
import { readRecordAsText } from "../../archives/readRecordAsText.ts"
import type { Archive } from "../../archives/types.ts"
import { getArchiveOpfRecord } from "./getArchiveOpfRecord.ts"
import { type OpfMetadata, parseOpf } from "./parse.ts"

export type ArchiveOpfParsed = {
  opf: OpfMetadata
  basePath: string
}

/**
 * Loads and parses the package OPF from `archive`: the package document
 * {@link getArchiveOpfRecord} finds, and the folder its hrefs are relative to.
 *
 * **Attention — not memoized:** every call reads and parses the container
 * file and the package document again. Manifest generation already avoids
 * redundant parses by awaiting this once and passing `archiveOpf` into manifest
 * hooks. The resource pipeline (`generateResourceFromArchive` → `defaultHook`)
 * invokes this again per resource unless callers later thread parsed OPF in
 * explicitly (optional parameter, archive open hook, etc.).
 */
export async function readArchiveOpf(
  archive: Archive,
): Promise<ArchiveOpfParsed | undefined> {
  const record = await getArchiveOpfRecord(archive)

  if (!record) return undefined

  return {
    opf: parseOpf(await readRecordAsText(record)),
    basePath: getUriBasePath(record.uri),
  }
}

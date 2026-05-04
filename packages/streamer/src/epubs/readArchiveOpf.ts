import { type OpfMetadata, parseOpf } from "@prose-reader/archive-parser"
import type { Archive } from "../archives/types"
import { getArchiveOpfInfo } from "./getArchiveOpfInfo"

export type ArchiveOpfParsed = {
  opf: OpfMetadata
  basePath: string
}

/**
 * Loads and parses the package OPF from `archive`.
 *
 * **Attention — not memoized:** every call re-reads the OPF record and runs
 * `parseOpf`. Manifest generation already avoids redundant parses by awaiting
 * this once and passing `archiveOpf` into manifest hooks. The resource pipeline
 * (`generateResourceFromArchive` → `defaultHook`) invokes this again per
 * resource unless callers later thread parsed OPF in explicitly (optional
 * parameter, archive open hook, etc.).
 */
export async function readArchiveOpf(
  archive: Archive,
): Promise<ArchiveOpfParsed | undefined> {
  const { data: opsFile, basePath } = getArchiveOpfInfo(archive) || {}

  if (!opsFile || opsFile.dir) {
    return undefined
  }

  const raw = await opsFile.string()

  return {
    opf: parseOpf(raw),
    basePath,
  }
}

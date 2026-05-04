import { type OpfMetadata, parseOpf } from "@prose-reader/archive-parser"
import type { Archive } from "../archives/types"
import { getArchiveOpfInfo } from "./getArchiveOpfInfo"

export type ArchiveOpfParsed = {
  opf: OpfMetadata
  basePath: string
}

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

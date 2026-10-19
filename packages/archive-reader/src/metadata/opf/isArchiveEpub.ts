import type { Archive } from "../../archives/types.ts"
import { isOpfRecord } from "./getArchiveOpfRecord.ts"

export const isArchiveEpub = (archive: Archive) =>
  archive.records.some(isOpfRecord)

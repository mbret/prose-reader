import { Report } from "../report"
import { printTree } from "./printTree"
import type { Archive, ArchiveRecord } from "./types"

type ArchiveInit = Omit<Archive, "recordsByUri">

/**
 * Builds an {@link Archive} from its records and derives the `recordsByUri`
 * lookup index once, so consumers resolve records in O(1) on the hot path
 * instead of scanning {@link Archive.records}. Duplicate URIs keep the first
 * record, matching the previous `Array.prototype.find` semantics.
 */
export const createArchive = ({ records, ...rest }: ArchiveInit): Archive => {
  const recordsByUri = new Map<string, ArchiveRecord>()

  for (const record of records) {
    if (!recordsByUri.has(record.uri)) {
      recordsByUri.set(record.uri, record)
    }
  }

  const archive: Archive = {
    ...rest,
    records,
    recordsByUri,
  }

  Report.log("Generated archive", archive)

  if (process.env.NODE_ENV === "development") {
    if (Report.isEnabled()) {
      const folderStructureStr = printTree(records.map((record) => record.uri))
      Report.groupCollapsed(...Report.getGroupArgs("Archive folder structure"))
      Report.log(`\n${folderStructureStr}`)
      Report.groupEnd()
    }
  }

  return archive
}

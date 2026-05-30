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

  return {
    ...rest,
    records,
    recordsByUri,
  }
}

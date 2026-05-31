import { detectMimeTypeFromName } from "@prose-reader/shared"
import { sortByTitleComparator } from "../utils/sortByTitleComparator"
import { getUriBasename } from "../utils/uri"
import { createArchive } from "./createArchive"
import type { Archive, ArchiveRecord, FileRecord } from "./types"

/**
 * Normalized view of a source entry, shared by every `createArchiveFrom*`
 * creator that enumerates a flat list of records. A source only has to provide
 * each entry's `uri`, whether it is a directory, and (for files) its `size`
 * plus content accessors; everything else (basename derivation, mime
 * detection, ordering, the `recordsByUri` index) is handled centrally here.
 */
export type ArchiveEntry =
  | { dir: true; uri: string }
  | ({ dir: false; uri: string; size: number } & Pick<
      FileRecord,
      "blob" | "arrayBuffer"
    >)

export type CreateArchiveFromEntriesOptions = {
  orderByAlpha?: boolean
  name?: string
  encodingFormat?: string
  close: () => Promise<void>
}

/**
 * Builds an {@link Archive} from an arbitrary source list. `toEntry` is invoked
 * once per item, and the resulting records are sorted in place when
 * `orderByAlpha` is set — there is no intermediate array, so construction stays
 * a single map plus an optional sort regardless of the source.
 */
export const createArchiveFromEntries = <Item>(
  items: Item[],
  toEntry: (item: Item) => ArchiveEntry,
  {
    orderByAlpha,
    name,
    encodingFormat,
    close,
  }: CreateArchiveFromEntriesOptions,
): Archive => {
  const records = items.map((item): ArchiveRecord => {
    const entry = toEntry(item)
    const basename = getUriBasename(entry.uri)

    if (entry.dir) {
      return { dir: true, basename, uri: entry.uri }
    }

    return {
      dir: false,
      basename,
      uri: entry.uri,
      encodingFormat: detectMimeTypeFromName(entry.uri),
      size: entry.size,
      blob: entry.blob,
      arrayBuffer: entry.arrayBuffer,
    }
  })

  if (orderByAlpha) {
    records.sort((a, b) => sortByTitleComparator(a.uri, b.uri))
  }

  return createArchive({ filename: name, encodingFormat, records, close })
}

export type FileRecord = {
  dir: false
  basename: string
  uri: string
  /** Uncompressed byte length of the record, or `0` when unknown. */
  size: number
  // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
  encodingFormat?: string
  blob: () => Promise<Blob>
  arrayBuffer: () => Promise<ArrayBuffer>
}

export type DirectoryRecord = {
  dir: true
  basename: string
  uri: string
}

export type ArchiveRecord = FileRecord | DirectoryRecord

export type Archive = {
  /**
   * Container-level filename when known (e.g. the originating `.cbz`/`.epub`
   * file name). Absent for synthetic archives that have no real source file
   * (URL lists, raw array buffers). Consumers use it as a detection signal, so
   * it must never be fabricated.
   */
  filename?: string
  /**
   * Archive-level media type when known (e.g. `application/vnd.comicbook+zip`
   * for a CBZ). This is the mime type of the container itself, not of any
   * individual record; record-level mime types live on {@link FileRecord}.
   */
  encodingFormat?: string
  records: ArchiveRecord[]
  /**
   * `uri` → record index built once at construction (see `createArchive`).
   * Resource resolution is a per-fetched-file hot path, so prefer this (or
   * {@link getArchiveFileRecordByUri}) over scanning {@link Archive.records}.
   */
  recordsByUri: ReadonlyMap<string, ArchiveRecord>
  close: () => Promise<void>
}

export const isFileRecord = (record: ArchiveRecord): record is FileRecord =>
  !record.dir

export const isDirectoryRecord = (
  record: ArchiveRecord,
): record is DirectoryRecord => record.dir

export const getArchiveFileRecordByUri = (
  archive: Pick<Archive, "recordsByUri">,
  uri: string,
): FileRecord | undefined => {
  const record = archive.recordsByUri.get(uri)

  return record && isFileRecord(record) ? record : undefined
}

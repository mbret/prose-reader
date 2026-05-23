export interface StreamResult {
  on(e: `data`, cb: (data: Uint8Array) => void): void
  on(e: `error`, cb: (error: Error) => void): void
  on(e: `end`, cb: () => void): void
  resume(): void
}

export type FileRecord = {
  dir: false
  basename: string
  uri: string
  blob: () => Promise<Blob>
  string: () => Promise<string>
  stream?: () => StreamResult
  size: number
  // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
  encodingFormat?: string
}

export type DirectoryRecord = {
  dir: true
  basename: string
  uri: string
  size: number
  encodingFormat?: undefined
}

export type Archive = {
  filename: string
  /**
   * Archive-level media type when known (e.g. `application/vnd.comicbook+zip`
   * for a CBZ). This is the mime type of the container itself, not of any
   * individual record; record-level mime types live on {@link FileRecord}.
   */
  encodingFormat?: string
  records: (FileRecord | DirectoryRecord)[]
  close: () => Promise<void>
}

export const isFileRecord = (
  record: Archive["records"][number],
): record is FileRecord => !record.dir

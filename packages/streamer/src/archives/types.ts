export interface StreamResult {
  on(e: `data`, cb: (data: Uint8Array) => void): void
  on(e: `error`, cb: (error: Error) => void): void
  on(e: `end`, cb: () => void): void
  resume(): void
}

type FileRecord = {
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

type DirectoryRecord = {
  dir: true
  basename: string
  uri: string
  size: number
  encodingFormat?: undefined
}

export type Archive = {
  filename: string
  records: (FileRecord | DirectoryRecord)[]
  close: () => Promise<void>
}

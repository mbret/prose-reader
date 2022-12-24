export interface StreamResult {
  on(e: `data`, cb: (data: Uint8Array) => void): void
  on(e: `error`, cb: (error: Error) => void): void
  on(e: `end`, cb: () => void): void
  resume(): void
}

export type Archive = {
  filename: string
  files: {
    dir: boolean
    basename: string
    uri: string
    blob: () => Promise<Blob>
    string: () => Promise<string>
    base64: () => Promise<string>
    stream?: () => StreamResult
    size: number
    // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
    encodingFormat?: string
  }[]
}

import type { Manifest } from "@prose-reader/shared"

export type ViewportPosition = { x: number; y: number }

export type { LoadOptions, Reader } from "./Reader"

declare global {
  interface Window {
    __PROSE_READER_DEBUG?: boolean
  }
}

export { Manifest }

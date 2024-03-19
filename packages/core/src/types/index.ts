import type { Manifest } from "@prose-reader/shared"

export type ViewportPosition = { x: number; y: number }

declare global {
  interface Window {
    __PROSE_READER_DEBUG?: boolean
  }
}

export { Manifest }

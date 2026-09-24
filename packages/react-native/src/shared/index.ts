import type {
  ContextState,
  createReader,
  EnhancerPaginationInfo,
} from "@prose-reader/core"
import type { Bridge, BridgeStore } from "@webview-bridge/react-native"

type ReaderOptions = Parameters<typeof createReader>[0]
type RnContextState = Omit<ContextState, "rootElement">

/**
 * What the native side decides about the reader a `load` creates: the book,
 * and where to open it. They are the reader options that cross the bridge,
 * named as the reader names them, so the web side's factory spreads them into
 * the rest.
 */
export type ReaderLoadOptions = Pick<ReaderOptions, "manifest" | "cfi">

export interface BridgeState extends Bridge {
  pagination: EnhancerPaginationInfo | undefined
  setPagination: (pagination: EnhancerPaginationInfo) => Promise<void>
  context: RnContextState | undefined
  setContext: (context: RnContextState) => Promise<void>
  readingPosition: string | undefined
  setReadingPosition: (readingPosition: string) => Promise<void>
}

export type BridgeMethods = {
  getResource: (
    resource: Parameters<NonNullable<ReaderOptions["getResource"]>>[0],
  ) => Promise<{
    data: string
    headers?: Record<string, string>
  }>
}

export type ProseBridgeStore = BridgeStore<BridgeMethods & BridgeState>

export type ProsePostMessageSchema = {
  load: {
    validate: (data: unknown) => ReaderLoadOptions
  }
  turnRight: {
    validate: () => void
  }
  turnLeft: {
    validate: () => void
  }
}

export { useLiveRef } from "./useLiveRef"

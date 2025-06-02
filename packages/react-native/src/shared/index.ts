import type {
  ContextState,
  Manifest,
  PaginationState,
} from "@prose-reader/core"
import type { createReader } from "@prose-reader/core"
import type { Bridge, BridgeStore } from "@webview-bridge/react-native"

type ReaderOptions = Parameters<typeof createReader>[0]
type RnPaginationState = Omit<PaginationState, "navigationId">
type RnContextState = Omit<ContextState, "containerElement" | "rootElement">

export interface BridgeState extends Bridge {
  pagination: RnPaginationState | undefined
  setPagination: (pagination: RnPaginationState) => Promise<void>
  context: RnContextState | undefined
  setContext: (context: RnContextState) => Promise<void>
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
    validate: (data: unknown) => {
      manifest: Manifest
    }
  }
  turnRight: {
    validate: () => void
  }
  turnLeft: {
    validate: () => void
  }
}

export { useLiveRef } from "./useLiveRef"

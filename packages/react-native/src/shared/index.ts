import type {
  ContextState,
  createReader,
  EnhancerPaginationInfo,
  NavigationTarget,
} from "@prose-reader/core"
import type { Bridge, BridgeStore } from "@webview-bridge/react-native"

type ReaderOptions = Parameters<typeof createReader>[0]
type RnContextState = Omit<ContextState, "rootElement">

/**
 * What the native side decides about the reader a `load` creates: the book,
 * and where to open it. They are the reader options that cross the bridge,
 * named as the reader names them, so the web side's factory spreads them into
 * the rest. Only the targets that are plain data can cross it.
 */
export type ReaderLoadOptions = Pick<ReaderOptions, "manifest"> & {
  target?: NavigationTarget<"cfi" | "spineItem">
}

/**
 * What the web side reports of the reader of the book last loaded. Each value
 * is `null` until that reader has reported it: `null` rather than `undefined`
 * because the bridge store drops `undefined` values, so a `load` could not
 * clear the previous book's otherwise.
 */
export type ReaderState = {
  pagination: EnhancerPaginationInfo | null
  context: RnContextState | null
  readingPosition: string | null
}

export interface BridgeState extends Bridge, ReaderState {
  /**
   * Called by the web side with part of its reader's state, and the `load`
   * that reader was created for. A report for any `load` but the latest is
   * dropped: the previous reader's can still be crossing the bridge when the
   * next `load` starts.
   */
  report: (load: number, state: Partial<ReaderState>) => Promise<void>
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

/**
 * A `load` as it crosses the bridge: the options of the reader to create, and
 * which load it is, for the web side to tag that reader's reports with.
 */
export type ReaderLoadMessage = {
  load: number
  options: ReaderLoadOptions
}

export type ProsePostMessageSchema = {
  load: {
    validate: (data: unknown) => ReaderLoadMessage
  }
  turnRight: {
    validate: () => void
  }
  turnLeft: {
    validate: () => void
  }
}

export { useLiveRef } from "./useLiveRef"

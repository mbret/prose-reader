import { Report as SharedReport } from "@prose-reader/shared"

const PACKAGE_NAME = "@prose-reader/archive-reader"

// No explicit `enabled`: inherit the shared root, which auto-configures from
// the `globalThis.__PROSE_READER_DEBUG` flag (works in window, workers, node).
export const Report = SharedReport.namespace(PACKAGE_NAME, undefined, {
  color: "#42b0a5",
})

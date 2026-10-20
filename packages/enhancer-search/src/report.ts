import { Report } from "@prose-reader/shared"
import { name } from "../package.json"

// No explicit `enabled`: inherit the shared root, which auto-configures from
// the `globalThis.__PROSE_READER_DEBUG` flag (works in window, workers, node).
export const report = Report.namespace(name)

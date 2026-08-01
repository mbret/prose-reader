import { Report as SharedReport } from "@prose-reader/shared"
import { name } from "../package.json"

// No explicit `enabled`: inherit the shared root, which auto-configures from
// the `globalThis.__PROSE_READER_DEBUG` flag (works in window, workers, node).
export const Report = SharedReport.namespace(name, undefined, {
  color: "#b06642",
})

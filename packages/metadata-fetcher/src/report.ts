import { Report as SharedReport } from "@prose-reader/shared"

// The name is spelled out rather than read from package.json: node runs this
// source directly in development (see the `prose-source` export condition),
// and a JSON import needs an import attribute there — one more thing to keep
// in sync than a constant is worth.
const NAME = "@prose-reader/metadata-fetcher"

// No explicit `enabled`: inherit the shared root, which auto-configures from
// the `globalThis.__PROSE_READER_DEBUG` flag (works in window, workers, node).
export const Report = SharedReport.namespace(NAME, undefined, {
  color: "#b06642",
})

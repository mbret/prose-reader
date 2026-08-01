import { Report as SharedReport } from "@prose-reader/shared"

// Spelled out rather than read from package.json: node runs this source
// directly in development, where a JSON import needs an import attribute.
const NAME = "@prose-reader/metadata-fetcher"

// No explicit `enabled`: inherit the shared root, which auto-configures from
// the `globalThis.__PROSE_READER_DEBUG` flag.
export const Report = SharedReport.namespace(NAME, undefined, {
  color: "#b06642",
})

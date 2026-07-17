import type { FileRecord } from "./types"

/**
 * Decodes a record's bytes as UTF-8. The caller asserts the record is text;
 * there is intentionally no `string()` accessor on {@link FileRecord} so that
 * decoding a binary record is always a deliberate act at the call site.
 */
export const readRecordAsText = async (record: FileRecord): Promise<string> =>
  new TextDecoder().decode(await record.arrayBuffer())

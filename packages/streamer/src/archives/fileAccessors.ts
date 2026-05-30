import type { FileRecord } from "./types"

type FileContentAccessors = Pick<FileRecord, "blob" | "arrayBuffer">

/**
 * Derives the content accessors of a {@link FileRecord} from a single `Blob`
 * source. Content is not retained between calls so a long-lived archive does
 * not pin decompressed bytes in memory.
 */
export const blobFileAccessors = (
  blob: () => Promise<Blob>,
): FileContentAccessors => ({
  blob,
  arrayBuffer: () => blob().then((value) => value.arrayBuffer()),
})

/**
 * Derives the content accessors of a {@link FileRecord} from an `ArrayBuffer`
 * source, avoiding a `Blob` round-trip for binary-native archives. Content is
 * not retained between calls.
 */
export const arrayBufferFileAccessors = (
  arrayBuffer: () => Promise<ArrayBuffer>,
  type = ``,
): FileContentAccessors => ({
  arrayBuffer,
  blob: () => arrayBuffer().then((value) => new Blob([value], { type })),
})

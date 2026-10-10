import { md5HexDigest } from "./md5"

/** Bytes `util.partialMD5` reads at each of its offsets. */
const PARTIAL_MD5_SAMPLE_SIZE = 1024

/**
 * Where `util.partialMD5` (KOReader, frontend/util.lua) reads: at
 * `bit.lshift(1024, 2 * i)` for `i` from -1 to 10. LuaJIT keeps the low five
 * bits of a shift count, so `i = -1` shifts 1024 by 30 bits, out of 32 bits,
 * and reads at 0.
 */
const PARTIAL_MD5_SAMPLE_OFFSETS = [
  0, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864,
  268435456, 1073741824,
]

/**
 * The digest KOReader files a book's reading position under with its default
 * "Binary" document matching method: `util.partialMD5` (frontend/util.lua),
 * the MD5 of 1 KiB samples of the file at the offsets above, as lowercase hex.
 * A sample the end of the file cuts short is hashed as it is, and the samples
 * stop at the first offset at or past the end: at most 12 KiB of `file` are
 * read.
 *
 * KOReader computes it from the bytes it opens the first time and keeps it in
 * the book's settings, so the digests match only for the same bytes.
 */
export const getKoreaderFileDigest = async (file: Blob): Promise<string> => {
  const samples = await Promise.all(
    PARTIAL_MD5_SAMPLE_OFFSETS.filter((offset) => offset < file.size).map(
      async (offset) =>
        new Uint8Array(
          await file
            .slice(offset, offset + PARTIAL_MD5_SAMPLE_SIZE)
            .arrayBuffer(),
        ),
    ),
  )

  return md5HexDigest(samples)
}

/**
 * The digest KOReader files a book's reading position under with its
 * "Filename" document matching method (`KOSync:getFileNameDigest`,
 * plugins/kosync.koplugin/main.lua): the MD5 of the file name, as lowercase
 * hex.
 *
 * `fileName` is the base name, extension included, as the device's file
 * system stores it. KOReader hashes its UTF-8 bytes as they are, without
 * Unicode normalization: an `é` stored as one code point and one stored as an
 * `e` and a combining accent give two digests.
 */
export const getKoreaderFileNameDigest = (fileName: string): string =>
  md5HexDigest([new TextEncoder().encode(fileName)])

import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { md5HexDigest } from "./md5"

const md5OfText = (text: string) =>
  md5HexDigest([new TextEncoder().encode(text)])

const nodeMd5 = (bytes: Uint8Array) =>
  createHash("md5").update(bytes).digest("hex")

/** Bytes that differ from one position to the next, and from one length to another. */
const bytesOfLength = (length: number) =>
  Uint8Array.from({ length }, (_, index) => (index * 151 + length * 7) % 256)

describe("md5HexDigest", () => {
  it.each([
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
    [
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      "d174ab98d277d9f5a5611c2c9f419d9f",
    ],
    [
      "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
      "57edf4a22be3c955ac49da2e2107b67a",
    ],
  ])("gives the digest of %j in RFC 1321's test suite", (text, digest) => {
    expect(md5OfText(text)).toBe(digest)
  })

  it("agrees with node:crypto for every length up to three blocks", () => {
    for (let length = 0; length <= 3 * 64; length++) {
      const bytes = bytesOfLength(length)

      expect(md5HexDigest([bytes]), `${length} bytes`).toBe(nodeMd5(bytes))
    }
  })

  it("hashes chunks as one message", () => {
    const bytes = bytesOfLength(12 * 1024 + 5)
    const chunks = [
      bytes.subarray(0, 1),
      bytes.subarray(1, 1025),
      bytes.subarray(1025, 1025),
      bytes.subarray(1025),
    ]

    expect(md5HexDigest(chunks)).toBe(nodeMd5(bytes))
  })
})

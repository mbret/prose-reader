/** MD5 (RFC 1321), which Web Crypto does not provide. */

/** `[k, s, T[i]]` of RFC 1321, section 3.4: the block word added, the left rotation and the sine constant. */
type Md5Operation = readonly [
  wordIndex: number,
  rotation: number,
  constant: number,
]

type Md5Round = {
  /** The round's auxiliary function: F, G, H or I. */
  mix: (b: number, c: number, d: number) => number
  operations: readonly Md5Operation[]
}

/** The 64 operations of a block, in the order of RFC 1321, section 3.4. */
const MD5_ROUNDS: readonly Md5Round[] = [
  {
    mix: (b, c, d) => (b & c) | (~b & d),
    operations: [
      [0, 7, 0xd76aa478],
      [1, 12, 0xe8c7b756],
      [2, 17, 0x242070db],
      [3, 22, 0xc1bdceee],
      [4, 7, 0xf57c0faf],
      [5, 12, 0x4787c62a],
      [6, 17, 0xa8304613],
      [7, 22, 0xfd469501],
      [8, 7, 0x698098d8],
      [9, 12, 0x8b44f7af],
      [10, 17, 0xffff5bb1],
      [11, 22, 0x895cd7be],
      [12, 7, 0x6b901122],
      [13, 12, 0xfd987193],
      [14, 17, 0xa679438e],
      [15, 22, 0x49b40821],
    ],
  },
  {
    mix: (b, c, d) => (b & d) | (c & ~d),
    operations: [
      [1, 5, 0xf61e2562],
      [6, 9, 0xc040b340],
      [11, 14, 0x265e5a51],
      [0, 20, 0xe9b6c7aa],
      [5, 5, 0xd62f105d],
      [10, 9, 0x02441453],
      [15, 14, 0xd8a1e681],
      [4, 20, 0xe7d3fbc8],
      [9, 5, 0x21e1cde6],
      [14, 9, 0xc33707d6],
      [3, 14, 0xf4d50d87],
      [8, 20, 0x455a14ed],
      [13, 5, 0xa9e3e905],
      [2, 9, 0xfcefa3f8],
      [7, 14, 0x676f02d9],
      [12, 20, 0x8d2a4c8a],
    ],
  },
  {
    mix: (b, c, d) => b ^ c ^ d,
    operations: [
      [5, 4, 0xfffa3942],
      [8, 11, 0x8771f681],
      [11, 16, 0x6d9d6122],
      [14, 23, 0xfde5380c],
      [1, 4, 0xa4beea44],
      [4, 11, 0x4bdecfa9],
      [7, 16, 0xf6bb4b60],
      [10, 23, 0xbebfbc70],
      [13, 4, 0x289b7ec6],
      [0, 11, 0xeaa127fa],
      [3, 16, 0xd4ef3085],
      [6, 23, 0x04881d05],
      [9, 4, 0xd9d4d039],
      [12, 11, 0xe6db99e5],
      [15, 16, 0x1fa27cf8],
      [2, 23, 0xc4ac5665],
    ],
  },
  {
    mix: (b, c, d) => c ^ (b | ~d),
    operations: [
      [0, 6, 0xf4292244],
      [7, 10, 0x432aff97],
      [14, 15, 0xab9423a7],
      [5, 21, 0xfc93a039],
      [12, 6, 0x655b59c3],
      [3, 10, 0x8f0ccc92],
      [10, 15, 0xffeff47d],
      [1, 21, 0x85845dd1],
      [8, 6, 0x6fa87e4f],
      [15, 10, 0xfe2ce6e0],
      [6, 15, 0xa3014314],
      [13, 21, 0x4e0811a1],
      [4, 6, 0xf7537e82],
      [11, 10, 0xbd3af235],
      [2, 15, 0x2ad7d2bb],
      [9, 21, 0xeb86d391],
    ],
  },
]

const MD5_BLOCK_SIZE = 64

const rotateLeft = (value: number, bits: number) =>
  (value << bits) | (value >>> (32 - bits))

/**
 * The message as MD5 processes it (RFC 1321, sections 3.1 and 3.2): the
 * chunks one after the other, a 0x80 byte, zeros up to 8 bytes short of a
 * block boundary, then the message length in bits, little-endian on 64 bits.
 */
const padMd5Message = (chunks: readonly Uint8Array[]) => {
  const messageLength = chunks.reduce(
    (length, chunk) => length + chunk.byteLength,
    0,
  )
  const padded = new Uint8Array(
    Math.ceil((messageLength + 9) / MD5_BLOCK_SIZE) * MD5_BLOCK_SIZE,
  )
  let chunkOffset = 0

  for (const chunk of chunks) {
    padded.set(chunk, chunkOffset)
    chunkOffset += chunk.byteLength
  }

  padded[messageLength] = 0x80

  const view = new DataView(padded.buffer)

  view.setUint32(padded.byteLength - 8, messageLength * 8, true)
  view.setUint32(
    padded.byteLength - 4,
    Math.floor(messageLength / 2 ** 29),
    true,
  )

  return view
}

/** The MD5 of the bytes of `chunks`, read one after the other, as lowercase hex. */
export const md5HexDigest = (chunks: readonly Uint8Array[]): string => {
  const message = padMd5Message(chunks)
  let stateA = 0x67452301
  let stateB = 0xefcdab89
  let stateC = 0x98badcfe
  let stateD = 0x10325476

  for (
    let blockOffset = 0;
    blockOffset < message.byteLength;
    blockOffset += MD5_BLOCK_SIZE
  ) {
    let a = stateA
    let b = stateB
    let c = stateC
    let d = stateD

    for (const { mix, operations } of MD5_ROUNDS) {
      for (const [wordIndex, rotation, constant] of operations) {
        const word = message.getUint32(blockOffset + 4 * wordIndex, true)
        const rotated = rotateLeft(a + mix(b, c, d) + constant + word, rotation)

        a = d
        d = c
        c = b
        b = (b + rotated) | 0
      }
    }

    stateA = (stateA + a) | 0
    stateB = (stateB + b) | 0
    stateC = (stateC + c) | 0
    stateD = (stateD + d) | 0
  }

  const digest = new DataView(new ArrayBuffer(16))

  digest.setUint32(0, stateA, true)
  digest.setUint32(4, stateB, true)
  digest.setUint32(8, stateC, true)
  digest.setUint32(12, stateD, true)

  return Array.from(new Uint8Array(digest.buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

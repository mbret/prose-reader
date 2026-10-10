# Document digests

A KOReader sync server files reading positions by user and by `document`, a digest each client computes from the book. Two clients share a position only when they compute the same digest for the same book. `@prose-reader/koreader` computes the two digests KOReader uses, exactly as KOReader does.

```typescript
import {
  getKoreaderFileDigest,
  getKoreaderFileNameDigest,
} from "@prose-reader/koreader"

// "Binary", KOReader's default: from the bytes of any Blob (a File, a blob
// from IndexedDB, …), reading at most 12 KiB of it
const documentOfFile = await getKoreaderFileDigest(file)

// "Filename": from the name of the file
const documentOfName = getKoreaderFileNameDigest("Les Misérables.epub")
// => "b52243e30c4613e8e83d76d2e7e671e4"
```

In Node, `fs.openAsBlob(path)` gives a `Blob` backed by the file.

## Which one

KOReader's sync plugin has a "Document matching method" setting: "Binary" by default, or "Filename". It is one setting per device, applied to every book. A device and a client sync a book only when they use the same method.

| Function | KOReader's method | Digest of |
| --- | --- | --- |
| `getKoreaderFileDigest(file)` | Binary | samples of the file's bytes, `util.partialMD5` (frontend/util.lua) |
| `getKoreaderFileNameDigest(fileName)` | Filename | the file name, `KOSync:getFileNameDigest` (plugins/kosync.koplugin/main.lua) |

Both return the MD5 as 32 lowercase hex characters, as KOReader sends it. koreader-sync-server stores `document` as it comes, so a digest in another case files positions under another book.

## Binary

`util.partialMD5` hashes up to twelve 1 KiB samples of the file: at 0, then at 1 KiB, 4 KiB, 16 KiB and so on, each offset four times the one before, up to 1 GiB. A sample the end of the file cuts short is hashed as it is, and the samples stop at the first offset at or past the end. `getKoreaderFileDigest` reads only those samples, through `Blob.slice()`: at most 12 KiB, however large the file.

The offsets come from `bit.lshift(1024, 2 * i)` for `i` from -1 to 10. LuaJIT keeps the low five bits of a shift count, so `i = -1` gives 0. A port that reads the negative count as a right shift samples at 256 instead, and gets another digest.

- **The bytes the device opened.** KOReader computes the digest the first time it opens a file and keeps it in the book's settings, as `partial_md5_checksum`. A file changed afterwards keeps its first digest on that device. A different download, edition or rewrite of the book gives another digest.
- **Samples only.** Two files that differ only outside the samples share a digest. KOReader relies on it for the PDFs it annotates by appending to them.
- The promise rejects when the `Blob` cannot be read.

## Filename

KOReader hashes the base name of the file, extension included, as the device's file system stores it: its UTF-8 bytes as they are, without Unicode normalization or case folding. `getKoreaderFileNameDigest` hashes the name it is given the same way, so pass the name as the device has it.

`Les Misérables.epub` gets two digests, in KOReader and here: one when its `é` is a single code point, another when it is an `e` and a combining accent.

## How it is tested

`src/tests/fixtures/koreader-digests.json` holds the digests KOReader itself computes, with its own `util.partialMD5` and its sync plugin's file name MD5, for:

- the fixture EPUBs;
- generated files of every edge size: empty, shorter than a sample, ending at an offset, a last sample cut to one byte, eleven or twelve samples around 1 GiB, past 4 GiB;
- file names in several scripts and both normalization forms.

`packages/koreader/tools/README.md` explains how to regenerate them from a KOReader Linux release.

## Prior art

Read against KOReader's source:

- **Readest** and **Calibre-Web Automated** compute the same digest.
- **Kavita** takes eleven samples, not twelve, so a file over 1 GiB gets another digest. It writes uppercase hex, and uppercases the digests it receives.
- **Komga** hashes a whole 1 KiB buffer after a short read, so a file whose end cuts a sample short gets another digest: one under 1 KiB, or ending less than 1 KiB after an offset.

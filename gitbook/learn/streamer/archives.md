# Archives

An **archive** is the streamer's environment-agnostic view of a book's container (an EPUB zip, a CBZ, a folder of images, a PDF, a list of URLs…). Both `generateManifestFromArchive` and `generateResourceFromArchive` operate on an `Archive`, so whatever the source, your first step is always to turn it into one with a `createArchiveFrom*` creator.

```typescript
import { generateManifestFromArchive } from "@prose-reader/streamer"

const archive = await createArchiveFromJszip(zip)
const manifest = await generateManifestFromArchive(archive)
```

## The archive contract

```typescript
type FileRecord = {
  dir: false
  basename: string
  uri: string
  /** Uncompressed byte length, or `0` when unknown. */
  size: number
  encodingFormat?: string
  blob: () => Promise<Blob>
  arrayBuffer: () => Promise<ArrayBuffer>
}

type DirectoryRecord = {
  dir: true
  basename: string
  uri: string
}

type ArchiveRecord = FileRecord | DirectoryRecord

type Archive = {
  /** Container filename when known (used as a detection signal — never fabricate it). */
  filename?: string
  /** Container-level media type, e.g. `application/vnd.comicbook+zip` for a CBZ. */
  encodingFormat?: string
  records: ArchiveRecord[]
  /** `uri` → record index, built once by `createArchive` for O(1) lookups. */
  recordsByUri: ReadonlyMap<string, ArchiveRecord>
  close: () => Promise<void>
}
```

A few rules of thumb:

- **Bytes** come from `record.blob()` or `record.arrayBuffer()`.
- **Text** is read with `readRecordAsText(record)` (it decodes `arrayBuffer()` as UTF‑8). There is intentionally no `string()` accessor, so decoding a binary record is always a deliberate act at the call site.
- **Lookups** should go through `getArchiveFileRecordByUri(archive, uri)` (backed by `recordsByUri`) rather than scanning `archive.records`, since resource resolution is a per-fetch hot path.
- Always build archives with `createArchive` (directly or via a creator) so `recordsByUri` is populated.

{% hint style="info" %}
`filename` is optional and is used as a detection signal (e.g. CBZ detection keys off a `.cbz` extension). Don't invent one for synthetic archives such as URL lists.
{% endhint %}

## Creators

| Creator | Import | Source | Notes |
| --- | --- | --- | --- |
| `createArchiveFromJszip` | `@prose-reader/streamer/archives/createArchiveFromJszip` | a loaded `JSZip` instance | optional peer dep `jszip` |
| `createArchiveFromLibArchive` | `@prose-reader/streamer/archives/createArchiveFromLibArchive` | a `libarchive.js` reader (rar, 7z, …) | optional peer dep `libarchive.js`; uses a web worker (not service-worker friendly) |
| `createArchiveFromUnzipper` | `@prose-reader/streamer/archives/createArchiveFromUnzipper` | an `unzipper` `CentralDirectory` | optional peer dep `unzipper`; node, random-access |
| `createArchiveFromNodeUnrarJs` | `@prose-reader/streamer/archives/createArchiveFromNodeUnrarJs` | a `node-unrar-js` `Extractor` (rar, cbr) | optional peer dep `node-unrar-js`; WASM-based |
| `createArchiveFromArrayBufferList` | `@prose-reader/streamer` | a list of `{ name, size, isDir, data() }` | environment-agnostic |
| `createArchiveFromText` | `@prose-reader/streamer` | a `string` or `Blob` of text | wraps plain text as a single-page reflowable book |
| `createArchiveFromUrls` | `@prose-reader/streamer` | a list of image URLs | pre-paginated; URLs must be same-origin or CORS-enabled |
| `createArchiveFromPdf` | `@prose-reader/enhancer-pdf` | a PDF `Blob` | see [PDF enhancer](../../enhancers/pdf.md) |
| `createArchiveFromExpoFileSystemNext` | `@prose-reader/react-native` | an `expo-file-system/next` `Directory` | see [React Native](react-native.md) |

The `jszip`, `libarchive.js`, `unzipper` and `node-unrar-js` creators ship as **subpath exports** so the underlying library stays an *optional* peer dependency — you only install (and bundle) the one you use.

### From a JSZip archive (browser)

```typescript
import { createArchiveFromJszip } from "@prose-reader/streamer/archives/createArchiveFromJszip"
import { loadAsync } from "jszip"

const zip = await loadAsync(await (await fetch("book.epub")).blob())
const archive = await createArchiveFromJszip(zip, { name: "book.epub" })
```

### From unzipper (node)

```typescript
import { createArchiveFromUnzipper } from "@prose-reader/streamer/archives/createArchiveFromUnzipper"
import unzipper from "unzipper"

const directory = await unzipper.Open.file("book.cbz")
const archive = await createArchiveFromUnzipper(directory, { name: "book.cbz" })
```

### From a RAR/CBR archive (node-unrar-js)

```typescript
import { createArchiveFromNodeUnrarJs } from "@prose-reader/streamer/archives/createArchiveFromNodeUnrarJs"
import { createExtractorFromData } from "node-unrar-js"

const extractor = await createExtractorFromData({ data: rarArrayBuffer })
const archive = await createArchiveFromNodeUnrarJs(extractor, { name: "book.cbr" })
```

### From plain text

```typescript
import { createArchiveFromText } from "@prose-reader/streamer"

const archive = await createArchiveFromText("Hello world", { direction: "ltr" })
```

### From a list of image URLs

```typescript
import { createArchiveFromUrls } from "@prose-reader/streamer"

const archive = await createArchiveFromUrls([
  "https://cdn.example.com/page-1.jpg",
  "https://cdn.example.com/page-2.jpg",
])
```

## Helpers

When you build records yourself (for a custom source), use the accessor factories so every record exposes both `blob()` and `arrayBuffer()` consistently:

```typescript
import {
  arrayBufferFileAccessors,
  blobFileAccessors,
} from "@prose-reader/streamer"

// Blob-native source (the factory derives arrayBuffer from blob)
blobFileAccessors(async () => new Blob([bytes]))

// Binary-native source (the factory derives blob from the array buffer)
arrayBufferFileAccessors(async () => bytes, "image/jpeg")
```

## Writing a custom source

If none of the creators fit, build records and hand them to `createArchive` so the `recordsByUri` index is derived for you:

```typescript
import { blobFileAccessors, createArchive } from "@prose-reader/streamer"

const archive = createArchive({
  filename: "custom",
  records: [
    {
      dir: false,
      basename: "content.opf",
      uri: "content.opf",
      size: opf.length,
      ...blobFileAccessors(async () => new Blob([opf])),
    },
  ],
  close: () => Promise.resolve(),
})
```

# Archive Reader

**`@prose-reader/archive-reader`** is the "book container in → resolved publication out" package: a standalone library usable by any reading or library app, prose or not. An **archive** is its environment-agnostic view of a book's container (an EPUB zip, a CBZ, a folder of images, a PDF, a list of URLs…) — the `Archive` type, the `createArchiveFrom*` creators and the whole resolve layer live here. The [streamer](../learn/streamer/README.md) is one consumer among others: its `generateManifestFromArchive` is `resolveArchive` plus a mapping into serving space.

Whatever the source, the first step is always to turn it into an `Archive` with a `createArchiveFrom*` creator; the flagship second step is `resolveArchive`:

```typescript
import { resolveArchive } from "@prose-reader/archive-reader"
import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"

const archive = await createArchiveFromJszip(zip)
const { metadata, readingOrder, toc } = await resolveArchive(archive)
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
- **Images** are identified with `isImageRecord(record)` (an `image/*` media type, by encoding format or filename) and listed with `getArchiveImageRecords(archive)` — the page listing of a comic or image container.
- Always build archives with `createArchive` (directly or via a creator) so `recordsByUri` is populated.

{% hint style="info" %}
`filename` is optional and is used as a detection signal (e.g. CBZ detection keys off a `.cbz` extension). Don't invent one for synthetic archives such as URL lists.
{% endhint %}

## Creators

| Creator | Import | Source | Notes |
| --- | --- | --- | --- |
| `createArchiveFromJszip` | `@prose-reader/archive-reader/archives/createArchiveFromJszip` | a loaded `JSZip` instance | optional peer dep `jszip` |
| `createArchiveFromZipJs` | `@prose-reader/archive-reader/archives/createArchiveFromZipJs` | a `zip.js` `ZipReader` instance | optional peer dep `@zip.js/zip.js`; browser/worker, multi-core, zip64 |
| `createArchiveFromLibArchive` | `@prose-reader/archive-reader/archives/createArchiveFromLibArchive` | a `libarchive.js` reader (rar, 7z, …) | optional peer dep `libarchive.js`; uses a web worker (not service-worker friendly) |
| `createArchiveFromUnzipper` | `@prose-reader/archive-reader/archives/createArchiveFromUnzipper` | an `unzipper` `CentralDirectory` | optional peer dep `unzipper`; node, random-access |
| `createArchiveFromNodeUnrarJs` | `@prose-reader/archive-reader/archives/createArchiveFromNodeUnrarJs` | a `node-unrar-js` `Extractor` (rar, cbr) | optional peer dep `node-unrar-js`; WASM-based |
| `createArchiveFromArrayBufferList` | `@prose-reader/archive-reader` | a list of `{ name, size, isDir, data() }` | environment-agnostic |
| `createArchiveFromText` | `@prose-reader/archive-reader` | a `string` or `Blob` of text | wraps plain text as a single-page reflowable book |
| `createArchiveFromUrls` | `@prose-reader/archive-reader` | a list of image URLs | pre-paginated; URLs must be same-origin or CORS-enabled |
| `createArchiveFromPdf` | `@prose-reader/enhancer-pdf` | a PDF `Blob` | see [PDF enhancer](../enhancers/pdf.md) |
| `createArchiveFromExpoFileSystemNext` | `@prose-reader/react-native` | an `expo-file-system` `Directory` | see [React Native](../learn/streamer/react-native.md) |

The `jszip`, `zip.js`, `libarchive.js`, `unzipper` and `node-unrar-js` creators ship as **subpath exports** so the underlying library stays an *optional* peer dependency — you only install (and bundle) the one you use.

### From a JSZip archive (browser)

```typescript
import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { loadAsync } from "jszip"

const zip = await loadAsync(await (await fetch("book.epub")).blob())
const archive = await createArchiveFromJszip(zip, { name: "book.epub" })
```

### From a zip.js archive (browser/worker)

[zip.js](https://github.com/gildas-lormeau/zip.js) supports multi-core compression, web streams and zip64, which makes it a good fit for large containers in the browser or a service worker.

```typescript
import { createArchiveFromZipJs } from "@prose-reader/archive-reader/archives/createArchiveFromZipJs"
import { BlobReader, ZipReader } from "@zip.js/zip.js"

const blob = await (await fetch("book.epub")).blob()
const zipReader = new ZipReader(new BlobReader(blob))
const archive = await createArchiveFromZipJs(zipReader, { name: "book.epub" })
```

### From unzipper (node)

```typescript
import { createArchiveFromUnzipper } from "@prose-reader/archive-reader/archives/createArchiveFromUnzipper"
import unzipper from "unzipper"

const directory = await unzipper.Open.file("book.cbz")
const archive = await createArchiveFromUnzipper(directory, { name: "book.cbz" })
```

### From a RAR/CBR archive (node-unrar-js)

```typescript
import { createArchiveFromNodeUnrarJs } from "@prose-reader/archive-reader/archives/createArchiveFromNodeUnrarJs"
import { createExtractorFromData } from "node-unrar-js"

const extractor = await createExtractorFromData({ data: rarArrayBuffer })
const archive = await createArchiveFromNodeUnrarJs(extractor, { name: "book.cbr" })
```

### From plain text

```typescript
import { createArchiveFromText } from "@prose-reader/archive-reader"

const archive = await createArchiveFromText("Hello world", { direction: "ltr" })
```

### From a list of image URLs

```typescript
import { createArchiveFromUrls } from "@prose-reader/archive-reader"

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
} from "@prose-reader/archive-reader"

// Blob-native source (the factory derives arrayBuffer from blob)
blobFileAccessors(async () => new Blob([bytes]))

// Binary-native source (the factory derives blob from the array buffer)
arrayBufferFileAccessors(async () => bytes, "image/jpeg")
```

## Resolving a publication

`resolveArchive(archive, options?)` turns a container into a single resolved, enriched, **plain-JSON** entity — everything a reading or library app needs, with no archive handle attached (structured-clone-able, persistable, cacheable):

```typescript
import { resolveArchive } from "@prose-reader/archive-reader"

const resolved = await resolveArchive(archive)
// {
//   version: 1,
//   metadata: { title, cover?, numberOfPages?, contributors, renditionLayout, belongsTo, … },
//   readingOrder: [{ uri, id?, mediaType?, size?, renditionLayout?, progressionWeight, … }],
//   toc: [{ title, path, containerHref, contents }],
//   unreadableSources: [],
// }
```

Everything is **container-relative** (reading-order `uri`s, toc `containerHref`s): the entity carries no serving concern, consumers rebase into their own space.

### Projection tokens & cost classes

`include` picks which parts to resolve and return — the tokens are simply the result keys, and they follow I/O cost classes:

| Token | Cost |
| --- | --- |
| `metadata` | sidecar XML reads (OPF, ComicInfo.xml, Apple/Kobo display options) — cheap. Also derives `cover` and the counted `numberOfPages`, which for a package-less container costs an in-memory reading-order scan |
| `readingOrder` | the OPF read at most — cheap |
| `toc` | one nav or NCX document read+parse on top — medium |
| `sources` | same reads as `metadata` — the verbatim parser outputs, for provenance and single-format needs |
| `version`, `unreadableSources` | free, always present |

The default is `["metadata", "readingOrder", "toc"]`: **the default costs O(sidecar files); anything that reads the whole book is opt-in.** `sources` is deliberately not in the default set — it roughly doubles the persisted entity.

```typescript
// library-shelf scan: metadata only, skip the toc read
const { metadata } = await resolveArchive(archive, { include: ["metadata"] })

// provenance included
const resolved = await resolveArchive(archive, {
  include: ["metadata", "readingOrder", "toc", "sources"],
})
```

### Effort modifiers

`layoutScan` (default `false`) does not change the return type — it changes how hard the resolver works: it reads and XML-parses **every** reading-order document to apply the industry viewport heuristic (an explicitly-reflowable publication whose spine documents all declare `head > meta[name=viewport]` is promoted to `pre-paginated`, metadata and per-item). The refinement is merged into the result inside the resolver; you never re-implement the merge. The streamer's `generateManifestFromArchive` enables it.

### Metadata, sources & error policy

`metadata` is the cross-format union vocabulary — see [Resolved metadata](resolved-metadata.md) for the vocabulary, the per-format mapping tables and the precedence rules. `sources` carries the verbatim parser outputs (`opf` with its `basePath`, `comicInfo`, `apple`, `kobo`); everything in `sources` is also represented, normalized, in `metadata`. Per-source parse failures are swallowed (logged via the debug `Report`): a malformed source — a sidecar or the package document (OPF) itself — never fails the resolve. A book whose OPF won't parse still resolves: it simply doesn't contribute to `metadata`/`toc`, and the reading order degrades to the archive's file listing (see [Resolving the reading order](#resolving-the-reading-order)).

`unreadableSources` is the trace those swallowed failures leave — the sources the container **carries** but that yielded no parsed value:

```typescript
const { metadata, unreadableSources } = await resolveArchive(archive)

// declared yet broken: refuse the publication rather than present an empty book
if (unreadableSources.includes("opf")) {
  throw new Error("Archive carries an OPF package document it cannot parse")
}
```

It is always present (empty when every carried source parsed) whatever the projection, so rejecting a corrupt publication costs neither the `sources` payload nor a container-format probe of your own: `sources.opf === undefined` cannot tell a broken package document from a container that has none (a CBZ), and testing the archive records yourself (`isArchiveEpub`) re-derives what the resolver already knows. Its entries are the `sources` keys (`ResolvedArchiveSourceKind`), but the two fields stay separate on purpose: `sources` holds what parsed, `unreadableSources` holds what didn't.

A source counts as unreadable when its document is there and reading or parsing it produced nothing — for the package document, that includes any `.opf` record the OPF discovery never reaches. A projection that reads nothing from the book (`include: ["version"]`) reports nothing.

## Reading embedded metadata

{% hint style="info" %}
This is the advanced layer underneath `resolveArchive` — reach for it when you need one specific source rather than the whole resolved entity.
{% endhint %}

Books embed metadata in format-specific documents: the EPUB package document (OPF), a `ComicInfo.xml` sidecar in comic archives, Apple/Kobo display-options XML in EPUBs from those stores. Each source has a `readArchive*` helper that discovers, reads and parses the document in one call, returning `undefined` when the archive doesn't carry that source:

```typescript
import {
  readArchiveOpf, // → { opf: OpfMetadata, basePath } | undefined
  readArchiveComicInfo, // → ComicInfo | undefined
  readArchiveApple, // → AppleMetadata | undefined
  readArchiveKobo, // → KoboMetadata | undefined
} from "@prose-reader/archive-reader"

const comicInfo = await readArchiveComicInfo(archive)
```

The parsed objects mirror their source document (`ComicInfo.Writer`, `OpfMetadata.spineRows`, …) and carry a `kind` discriminator. `resolveArchiveMetadata` normalizes a single one of them into the [`ResolvedMetadata`](resolved-metadata.md) vocabulary, and `resolveMetadata` merges several with the documented precedence:

```typescript
import { resolveArchiveMetadata } from "@prose-reader/archive-reader"

if (comicInfo) {
  const { title, contributors, readingDirection } =
    resolveArchiveMetadata(comicInfo)
}
```

{% hint style="info" %}
`resolveArchiveMetadata` and `resolveMetadata` see only parsed source documents, so they never populate the container-derived fields — `metadata.cover` and the counted `numberOfPages` fallback. Those need the file listing and come from `resolveArchive` (or `resolveArchiveCover`).
{% endhint %}

Malformed documents throw from the single-file readers (`readArchiveComicInfo`, `readArchiveApple`, `readArchiveOpf`) so you decide how lenient to be; `readArchiveKobo` merges every matching sidecar and skips unparseable ones. The lower-level pieces (`parseOpf`, `parseComicInfo`, `getArchiveOpfInfo`, `getArchiveHasComicInfo`, …) stay exported for advanced use.

## Resolving the reading order

`resolveArchiveReadingOrder(archive, options?)` is the standalone building block behind `resolveArchive`'s `readingOrder` token: the OPF spine when a usable package document exists (container-relative `uri`s, per-itemref layout hints, size-proportional `progressionWeight`), the archive's file listing otherwise — including when the package document is missing or unparseable — (sidecars like `ComicInfo.xml`/display-options and OS litter like `Thumbs.db` excluded, equal weights, discrete media marked `pre-paginated`). It always returns an array; a malformed OPF is treated as no OPF rather than throwing. Pass `{ opf }` to skip the internal OPF lookup.

## Resolving the cover

`resolveArchiveCover(archive, options?)` is the standalone building block behind `metadata.cover`: the OPF-declared cover image rebased to a container-relative `uri` (`confidence: "derived"`), else the first image of the reading order for image-content containers — comics, image archives, synthetic image-spine OPFs such as `createArchiveFromUrls` lists (`confidence: "assumed"`). It returns `undefined` when no cover is derivable: an authored reflowable EPUB (text spine, so an interior illustration is never promoted) or an audiobook/video archive has none.

```typescript
import { resolveArchiveCover } from "@prose-reader/archive-reader"

const cover = await resolveArchiveCover(archive)
// { uri: "OEBPS/cover.jpg", mediaType: "image/jpeg", confidence: "derived" } | undefined
```

Pass `{ opf }` and/or `{ readingOrder }` (already-resolved parts) to skip the internal lookups — `resolveArchive` threads both in.

## Resolving a table of contents

`resolveArchiveToc(archive, options?)` resolves the archive's table of contents into a generic, container-relative JSON structure — no XML, no format-specific handling on your side, and no streamer required (a bookshelf app can show a book's TOC straight from the archive):

```typescript
import { resolveArchiveToc } from "@prose-reader/archive-reader"

const toc = await resolveArchiveToc(archive)
// [{ title: "Chapter 1", path: "OEBPS/ch01.xhtml", containerHref: "OEBPS/ch01.xhtml", contents: [...] }, ...]
```

```typescript
type ArchiveTocItem = {
  title: string
  /** Reference as authored in the source (may carry a `#fragment`), or the raw record `uri` for folder-derived TOCs. */
  path: string
  /** URI reference in the container's coordinate space (no serving base baked in), safe to join onto a base URL. Empty when the entry has no target. */
  containerHref: string
  contents: ArchiveTocItem[]
}
```

Strategies are tried in order:

1. **EPUB nav document** (manifest item with `properties="nav"`)
2. **NCX** (`spine@toc` idref)
3. EPUB-like containers with neither resolve to an **explicit empty TOC** — the folder layout of an EPUB zip is not a meaningful TOC.
4. Anything else falls back to the **folder hierarchy** (e.g. a CBZ with one folder per chapter), or `undefined` when the archive is flat.

Entries carry no serving concern: `containerHref` lives in the container's coordinate space, and consumers rebase it into their own serving space by joining it onto a base URL (`generateManifestFromArchive` does exactly that to produce `manifest.nav.toc`). Pass `{ opf }` (an already parsed `readArchiveOpf` result) to skip the internal OPF lookup.

## Writing a custom source

If none of the creators fit, build records and hand them to `createArchive` so the `recordsByUri` index is derived for you:

```typescript
import { blobFileAccessors, createArchive } from "@prose-reader/archive-reader"

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

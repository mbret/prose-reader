# @prose-reader/archive-reader

The package owning the **generic, accessible view of a book's container**: it reads and parses archives (EPUB zip, CBZ, folder of images, list of URLs, plain text…) and exposes them behind a single environment-agnostic `Archive` contract. The streamer (and any other prose-reader package) consumes archives; this package is the sole producer.

It provides three layers:

- **Archive reading** — the `Archive` / `ArchiveRecord` types and the `createArchiveFrom*` creators (`jszip`, `zip.js`, `libarchive.js`, `unzipper`, `node-unrar-js`, array buffers, URLs, text) plus record helpers (`readRecordAsText`, `getArchiveFileRecordByUri`, accessor factories). Library-backed creators ship as subpath exports so each underlying library stays an optional peer dependency.
- **Metadata parsing** — typed parsers for common archive configuration files (OPF, `ComicInfo.xml`, Kobo display options, Apple iBooks display options) as TypeScript + JSON-like objects.
- **Metadata resolution** — `resolveArchiveMetadata` translates the different parsed formats into one common interpretation, plus archive-level queries (`getArchiveOpfInfo`, `readArchiveOpf`, `isArchiveEpub`, `getArchiveHasComicInfo`).

The parser is fast and platform agnostic (web, node). This package is not trying to become a standard, it is mostly used internally to help translate and normalize different book providers (or even different versions). Essentially, instead of implementing your own parser for "foo.xml" and trying to understand what is what, we offer a common reading, parsing and resolution layer.

Example of products that may take advantage of this package:
- App that lets user manipulate book archives
- Reading app
- App that handle book metadata

## ComicInfo.xml

We are following https://anansi-project.github.io/

## Epub

Spec for 3.3 is available at https://www.w3.org/TR/epub-33/

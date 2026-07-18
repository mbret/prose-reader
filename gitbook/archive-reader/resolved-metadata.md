# Resolved metadata

`resolveArchive` (and the lower-level `resolveMetadata`) normalize every metadata source a container can carry into one cross-format vocabulary: `ResolvedMetadata`. This page is the reference for that vocabulary, the per-format mapping tables, and the precedence rules when several sources speak.

## Design rules

- **Union schema, not intersection.** The shape is rich enough to express what any supported format can say; each source populates the subset it knows. Results are sparse: an absent key means "no source had anything to say", and empty arrays/strings collapse to absent so `field !== undefined` is a reliable presence check.
- **Vocabulary anchored on prior art.** Field names and semantics follow the [Readium Web Publication Manifest](https://readium.org/webpub-manifest/) where a term exists: `contributors` with role terms, `belongsTo.series`/`belongsTo.collection` with `position`, `numberOfPages`, `imprint`, `description`…
- **Normalization ≠ convergence.** Every field is typed/parsed/validated (`BlackAndWhite: "Yes"` → `boolean`, `Year`/`Month`/`Day` → a date shape), but concepts with no cross-format twin live in clearly format-scoped corners (`metadata.comic`, `metadata.apple`, `metadata.kobo`) rather than behind faked generic names.
- **Losslessness: sources are never load-bearing.** Everything a parser captures has a declared home in the resolved entity. For the closed schemas (ComicInfo, Apple, Kobo) this is compile-enforced by the mapping tables below (exported as `comicInfoMetadataHomes`, `appleMetadataHomes`, `koboMetadataHomes`, `opfMetadataHomes`); for the open-ended OPF `meta` vocabulary, every entry is structurally copied into `metadata.properties`, lossless by construction.
- **`metadata` versus `sources`.** `metadata` says what the resolver believes; `sources` (the verbatim parser outputs) say what the book said. The duplication is the contract: a wrong mapping opinion is revisable in a release because the raw value never left the entity.

## The vocabulary

```typescript
type ResolvedMetadata = {
  title?: string
  description?: string
  publisher?: string
  imprint?: string
  rights?: string
  languages?: string[]
  subjects?: string[]
  contributors?: { name: string; roles: string[]; sortAs?: string }[]
  published?: { year?: number; month?: number; day?: number }
  readingDirection?: "ltr" | "rtl"
  renditionLayout?: "reflowable" | "pre-paginated"
  renditionFlow?: "scrolled-continuous" | "scrolled-doc" | "paginated" | "auto"
  renditionSpread?: "none" | "landscape" | "portrait" | "both" | "auto"
  numberOfPages?: number
  gtin?: string
  isbn?: string
  identifiers?: { value: string; scheme?: string }[]
  belongsTo?: {
    series?: { name: string; position?: number; total?: number }[]
    collection?: { name: string; position?: number; total?: number }[]
  }
  /** open-world channel: every OPF <meta>, verbatim */
  properties?: { property?: string; refines?: string; name?: string; content?: string; value?: string }[]
  /** format-scoped corners */
  comic?: ResolvedComicMetadata
  apple?: { fixedLayout?: boolean; options?: { name?: string; value: string }[] }
  kobo?: { fixedLayout?: boolean }
}
```

### Contributor roles

Roles use the Readium terms our sources can express — `author`, `translator`, `editor`, `artist`, `illustrator`, `letterer`, `penciler`, `colorist`, `inker`, `narrator`, `contributor` — plus the prose-reader extension `coverArtist` (ComicInfo `CoverArtist`; Readium has no cover-art term). Well-known MARC relator codes from OPF (`aut`, `trl`, `edt`, `art`, `ill`, `clr`, `nrt`, `ctb`) are normalized to those terms; unknown tokens pass through verbatim. A role-less `dc:creator` defaults to `author`, a role-less `dc:contributor` to `contributor`.

## Precedence

When several sources are present, `resolveMetadata` merges field-wise:

| Field | Rule |
| --- | --- |
| descriptive fields (`title`, `description`, `publisher`, `languages`, `subjects`, `contributors`, `published`, `belongsTo`, `gtin`/`isbn`) | **OPF wins over ComicInfo** — the package document is the publication's own metadata; the sidecar fills gaps |
| `readingDirection` | **ComicInfo wins over OPF** (`Manga` beats `page-progression-direction`) — deliberate, preserving the historical pipeline behavior |
| `renditionLayout` | **OPF explicit → Apple → Kobo**, first defined wins; the [`layoutScan`](README.md#resolving-a-publication) promotion applies on top, inside the resolver |
| `identifiers` | concatenated, OPF first (identifier systems coexist) |
| corners (`comic`, `apple`, `kobo`) and single-source fields (`rights`, `properties`, `imprint`, `numberOfPages`) | from their only producer |

## Mapping tables

These mirror the compile-enforced tables shipped next to each resolver — the losslessness audit trail. Dotted paths address the scoped corners; `readingOrder`/`toc` mean the field feeds a sibling part of the resolved entity; `cover` and `guide` are reserved homes still only reachable through `sources`.

### ComicInfo → metadata

| ComicInfo field | Home | Notes |
| --- | --- | --- |
| `Title` | `title` | trimmed |
| `Summary` | `description` | |
| `Publisher` | `publisher` | |
| `Imprint` | `imprint` | |
| `LanguageISO` | `languages` | single-entry array |
| `Genre`, `Tags` | `subjects` | comma-split, Genre first |
| `Writer` | `contributors` | role `author`, comma-split |
| `Penciller` | `contributors` | role `penciler` |
| `Inker` | `contributors` | role `inker` |
| `Colorist` | `contributors` | role `colorist` |
| `Letterer` | `contributors` | role `letterer` |
| `CoverArtist` | `contributors` | role `coverArtist` |
| `Editor` | `contributors` | role `editor` |
| `Translator` | `contributors` | role `translator` |
| `Year`, `Month`, `Day` | `published` | independent optional components |
| `Manga` | `readingDirection` | `YesAndRightToLeft` → `rtl`; also `comic.manga` |
| `PageCount` | `numberOfPages` | |
| `GTIN` | `identifiers` | scheme `GTIN`; also `gtin`/`isbn` normalization |
| `Series`, `Number`, `Count` | `belongsTo.series` | name / position / total |
| `SeriesGroup` | `belongsTo.collection` | comma-split |
| `AlternateSeries`, `AlternateNumber`, `AlternateCount` | `comic.alternateSeries` | |
| `StoryArc`, `StoryArcNumber` | `comic.storyArcs` | comma-split, zipped positionally |
| `BlackAndWhite` | `comic.blackAndWhite` | Yes/No → boolean |
| `Volume` | `comic.volume` | numeric |
| `Format` | `comic.format` | |
| `AgeRating` | `comic.ageRating` | |
| `CommunityRating` | `comic.communityRating` | numeric |
| `Notes` | `comic.notes` | |
| `Review` | `comic.review` | |
| `Web` | `comic.web` | whitespace-split URL list |
| `ScanInformation` | `comic.scanInformation` | |
| `MainCharacterOrTeam` | `comic.mainCharacterOrTeam` | |
| `Characters` | `comic.characters` | comma-split |
| `Teams` | `comic.teams` | comma-split |
| `Locations` | `comic.locations` | comma-split |

### OPF → metadata

| OPF field | Home | Notes |
| --- | --- | --- |
| `dc:title` | `title` | first non-empty |
| `dc:description` | `description` | |
| `dc:publisher` | `publisher` | |
| `dc:rights` | `rights` | |
| `dc:language` | `languages` | all, document order |
| `dc:subject` | `subjects` | all, document order |
| `dc:creator`, `dc:contributor` | `contributors` | roles from `opf:role` and EPUB 3 `meta refines property="role"`, `file-as` → `sortAs` |
| `dc:date` | `published` | parsed as W3CDTF |
| `dc:identifier` | `identifiers` | all, with scheme; ISBN-scheme entries drive `isbn`/`gtin` |
| spine `page-progression-direction` | `readingDirection` | validated |
| `rendition:layout` meta | `renditionLayout` | validated |
| `rendition:flow` meta | `renditionFlow` | validated |
| `rendition:spread` meta | `renditionSpread` | validated |
| `belongs-to-collection` metas | `belongsTo` | `collection-type` `series` → series (with `group-position`), else collection |
| `calibre:series` / `calibre:series_index` | `belongsTo.series` | fallback when no EPUB 3 series meta |
| every `<meta>` | `properties` | verbatim, the open-world channel |
| manifest items, spine itemrefs | `readingOrder` | structural |
| spine `toc` idref | `toc` | structural |
| cover heuristics (`coverHref`) | `cover` | reserved — `sources.opf` only today |
| `<guide>` | `guide` | reserved — `sources.opf` only today |

### Apple / Kobo → metadata

| Source field | Home | Notes |
| --- | --- | --- |
| Apple `fixed-layout` option | `apple.fixedLayout` + `renditionLayout` | `true` → `pre-paginated` |
| Apple display options (all) | `apple.options` | verbatim, lossless |
| Kobo `fixed-layout` option | `kobo.fixedLayout` + `renditionLayout` | `true` → `pre-paginated` |

## Error policy & versioning

Per-source parse failures are swallowed and logged via the debug `Report` (books in the wild are dirty): a malformed `ComicInfo.xml` never fails a resolve, it just doesn't contribute. The `ResolvedArchive` entity carries a `version` field for consumers persisting it — bumped only when the shape or meaning of existing fields changes incompatibly; additive vocabulary growth does not bump it.

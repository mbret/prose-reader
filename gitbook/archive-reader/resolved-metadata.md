# Resolved metadata

`resolveArchive` (and the lower-level `resolveMetadata`) normalize every metadata source a container can carry into one cross-format vocabulary: `ResolvedMetadata`. This page is the reference for that vocabulary, the per-format mapping tables, and the precedence rules when several sources speak.

## Design rules

- **Union schema, not intersection.** The shape is rich enough to express what any supported format can say; each source populates the subset it knows. Results are sparse: an absent key means "no source had anything to say", and empty arrays/strings collapse to absent so `field !== undefined` is a reliable presence check.
- **Vocabulary anchored on prior art.** Field names and semantics follow the [Readium Web Publication Manifest](https://readium.org/webpub-manifest/) where a term exists: `contributors` with role terms, `belongsTo.series`/`belongsTo.collection` with `position`, `numberOfPages`, publication details, `description`…
- **Normalization ≠ convergence.** Every field is typed/parsed/validated (`BlackAndWhite: "Yes"` → `boolean`, `Year`/`Month`/`Day` → a date shape), but concepts with no cross-format twin live in clearly format-scoped corners (`metadata.comicInfo`, `metadata.apple`, `metadata.kobo`) rather than behind faked generic names.
- **Losslessness: sources are never load-bearing.** Everything a parser captures has a declared home in the resolved entity. For the closed schemas (ComicInfo, Apple, Kobo) this is compile-enforced by internal mapping tables next to each resolver (`comicInfoMetadataHomes`, `appleMetadataHomes`, `koboMetadataHomes`, `opfMetadataHomes`) — adding a parsed field without declaring its home is a type error, and the tables below transcribe them; for the open-ended OPF `meta` vocabulary, every entry is structurally copied into `metadata.properties`, lossless by construction.
- **`metadata` versus `sources`.** `metadata` says what the resolver believes; `sources` (the verbatim parser outputs) say what the book said. The duplication is the contract: a wrong mapping opinion is revisable in a release because the raw value never left the entity.

## The vocabulary

```typescript
/** "derived" = declared or properly computed; "assumed" = a best-effort convention */
type ResolvedConfidence = "derived" | "assumed"

type Collection = {
  name?: string
  /** EPUB `dcterms:identifier` refinement of the collection, catalog series ids */
  identifiers?: { value: string; scheme: string }[]
  position?: number
  total?: number
}

type ResolvedCover = {
  /** container-relative uri (rebase like reading-order uris), or an absolute url from a remote catalog */
  uri: string
  mediaType?: string
  confidence: ResolvedConfidence
}

type ResolvedMetadata = {
  /** every stated title, in document order — the first is the main title (`mainTitle(metadata)`) */
  titles?: {
    value: string
    type?: "main" | "subtitle" | "short" | "collection" | "edition" | "expanded" | (string & {})
    displaySeq?: number
    sortAs?: string
  }[]
  /** the cover image; resolved against the container, so `resolveArchive` only */
  cover?: ResolvedCover
  description?: string
  /** the work's first publication and this concrete edition are distinct facts */
  publication?: {
    original?: {
      date?: { year?: number; month?: number; day?: number }
      publisher?: string
      imprint?: string
    }
    edition?: {
      date?: { year?: number; month?: number; day?: number }
      publisher?: string
      imprint?: string
    }
  }
  rights?: string
  languages?: string[]
  subjects?: string[]
  contributors?: { name: string; roles: string[]; sortAs?: string }[]
  readingDirection?: "ltr" | "rtl"
  renditionLayout?: "reflowable" | "pre-paginated"
  renditionFlow?: "scrolled-continuous" | "scrolled-doc" | "paginated" | "auto"
  renditionSpread?: "none" | "landscape" | "portrait" | "both" | "auto"
  /** declared count, else counted page-like pages; `resolveArchive` only when counted */
  numberOfPages?: number
  identifiers?: {
    value: string
    scheme: "ISBN" | "GTIN" | "DOI" | "GoogleBooks" |
            "OpenLibrary" | "ProjectGutenberg" | "URL" | "Unknown" |
            (string & {})
    unique?: true
  }[]
  /** a collection is identified by a name, by identifiers, or by both — sources differ */
  belongsTo?: {
    series?: Collection[]
    collection?: Collection[]
  }
  /** open-world channel: every OPF <meta>, verbatim */
  properties?: { property?: string; refines?: string; name?: string; content?: string; value?: string }[]
  /** format-scoped corners */
  comicInfo?: ResolvedComicInfoMetadata
  apple?: { fixedLayout?: boolean; options?: { name?: string; value: string }[] }
  kobo?: { fixedLayout?: boolean }
}
```

### Cover and page count

Two fields are resolved for the whole **container**, not just its descriptive sidecars, so they are populated by `resolveArchive` and left absent by the source-level `resolveMetadata` / `resolveArchiveMetadata`, which never see the file listing:

- **`cover`** — the OPF-declared cover image (EPUB 3 `cover-image` property, the EPUB 2 `<meta name="cover">` convention, or a `cover`-ish image id), rebased onto a container-relative `uri` (`confidence: "derived"`); else the first image of the reading order for image-content containers — comics, image archives, synthetic image-spine OPFs such as `createArchiveFromUrls` lists (`confidence: "assumed"`). It stays absent when nothing image-like is a reading resource: an authored reflowable EPUB (text spine, so an interior illustration is never promoted) or an audiobook/video archive has no cover — a container with no cover of its own is exactly the case [metadata-fetcher](../metadata-fetcher/README.md) answers, with an absolute url into the catalog's cover service.
- **`numberOfPages`** — the declared ComicInfo `PageCount`, else the count of page-like reading-order items (images and fixed-layout documents). Reflowable documents are not pages, and audio/video tracks are not pages, so both are excluded: a reflowable book or an audiobook has no page count.

### Publication details

`publication.original` describes the work's first known publication. `publication.edition` describes the concrete publication represented by the current file or catalog item. Keeping each event's `date`, `publisher`, and `imprint` together prevents an EPUB edition date, an original print date, and a catalog site's release from being treated as interchangeable.

An EPUB package's `dc:date` is the publication date of that specific EPUB publication, so OPF and ComicInfo values populate `publication.edition`. Catalog providers can additionally populate `publication.original` when their source explicitly identifies the first publication.

### Contributor roles

Roles use the Readium terms our sources can express — `author`, `translator`, `editor`, `artist`, `illustrator`, `letterer`, `penciler`, `colorist`, `inker`, `narrator`, `contributor` — plus the prose-reader extension `coverArtist` (ComicInfo `CoverArtist`; Readium has no cover-art term). Well-known MARC relator codes from OPF (`aut`, `trl`, `edt`, `art`, `ill`, `clr`, `nrt`, `ctb`) are normalized to those terms; unknown tokens pass through verbatim. A role-less `dc:creator` defaults to `author`, a role-less `dc:contributor` to `contributor`.

### Identifiers

Every non-empty OPF `dc:identifier` is preserved in document order. The identifier selected by `package@unique-identifier` has `unique: true`. Parsed source data at `sources.opf.identifiers` also retains each element's XML `id`; normalized `metadata.identifiers` omits that internal anchor while keeping the semantic marker.

Normalized identifiers retain an explicitly authored EPUB 2 `opf:scheme`, or the value of an EPUB 3 `meta property="identifier-type"` that refines the identifier. Types expressed through `scheme="onix:codelist5"` are normalized to their named identifier system (`06` → `DOI`, `15` → `ISBN`, and the other standard codes used by the resolver). Known scheme spellings are canonicalized while custom strings remain valid. The direct EPUB 2 attribute wins when a hybrid file states both. Without an authored type, recognizable ISBN and GTIN values become `ISBN`/`GTIN`, a valid absolute HTTP(S) value becomes `URL`, and the lossless fallback is `Unknown`.

The shared `MetadataIdentifier`, `MetadataIdentifierScheme`, and `KnownMetadataIdentifierScheme` types are exported. `ResolvedMetadataIdentifier` adds only EPUB's optional `unique` marker. See [Publication identifiers](identifiers.md) for the complete resolution model, with [Google Books](google-books.md) and [Project Gutenberg](project-gutenberg.md) as concrete catalog examples.

## Precedence

When several sources are present, `resolveMetadata` merges field-wise:

| Field | Rule |
| --- | --- |
| descriptive fields (`titles`, `description`, `languages`, `subjects`, `contributors`, `belongsTo`) | **OPF wins over ComicInfo** — the package document is the publication's own metadata; the sidecar fills gaps |
| `publication.edition` details (`date`, `publisher`, `imprint`) | merged field-wise, **OPF wins over ComicInfo** and the sidecar fills gaps |
| `readingDirection` | **ComicInfo wins over OPF** (`Manga` beats `page-progression-direction`) — deliberate, preserving the historical pipeline behavior |
| `renditionLayout` | **OPF explicit → Apple → Kobo**, first defined wins; the [`layoutScan`](README.md#resolving-a-publication) promotion applies on top, inside the resolver |
| `identifiers` | concatenated, OPF first (identifier systems coexist) |
| `cover` | OPF-declared cover, else the first-image fallback for image-content containers (`resolveArchive` only) |
| `numberOfPages` | declared ComicInfo `PageCount`, else the counted page-like reading-order items (`resolveArchive` only) |
| corners (`comicInfo`, `apple`, `kobo`) and single-source fields (`rights`, `properties`) | from their only producer |

## Mapping tables

These mirror the compile-enforced tables shipped next to each resolver — the losslessness audit trail. Dotted paths address the scoped corners; `readingOrder`/`toc` mean the field feeds a sibling part of the resolved entity; `cover` is the `metadata.cover` field (resolved against the container by `resolveArchive`); `guide` is a reserved home still only reachable through `sources`.

### ComicInfo → metadata

| ComicInfo field | Home | Notes |
| --- | --- | --- |
| `Title` | `titles` | trimmed; the sidecar states one title, so `titles` has the single entry |
| `Summary` | `description` | |
| `Publisher` | `publication.edition.publisher` | |
| `Imprint` | `publication.edition.imprint` | |
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
| `Year`, `Month`, `Day` | `publication.edition.date` | independent optional components |
| `Manga` | `readingDirection` | `YesAndRightToLeft` → `rtl`; also `comicInfo.manga` |
| `PageCount` | `numberOfPages` | declared count; a page-like container without it is counted at the archive level |
| `GTIN` | `identifiers` | scheme `GTIN`; ISBN-shaped values remain searchable as ISBNs by metadata-fetcher |
| `Series`, `Number`, `Count` | `belongsTo.series` | name / position / total; `Number` or `Count` without a `Series` still states this issue's place, so the entry is kept without a name |
| `SeriesGroup` | `belongsTo.collection` | comma-split |
| `AlternateSeries`, `AlternateNumber`, `AlternateCount` | `comicInfo.alternateSeries` | |
| `StoryArc`, `StoryArcNumber` | `comicInfo.storyArcs` | comma-split, zipped positionally |
| `BlackAndWhite` | `comicInfo.blackAndWhite` | Yes/No → boolean |
| `Volume` | `comicInfo.volume` | numeric |
| `Format` | `comicInfo.format` | |
| `AgeRating` | `comicInfo.ageRating` | |
| `CommunityRating` | `comicInfo.communityRating` | numeric |
| `Notes` | `comicInfo.notes` | |
| `Review` | `comicInfo.review` | |
| `Web` | `comicInfo.web`, `identifiers` | whitespace-split reference list; valid absolute HTTP(S) values also become scheme `URL` identifiers |
| `ScanInformation` | `comicInfo.scanInformation` | |
| `MainCharacterOrTeam` | `comicInfo.mainCharacterOrTeam` | |
| `Characters` | `comicInfo.characters` | comma-split |
| `Teams` | `comicInfo.teams` | comma-split |
| `Locations` | `comicInfo.locations` | comma-split |

### OPF → metadata

| OPF field | Home | Notes |
| --- | --- | --- |
| `dc:title` | `titles` | every non-empty one, in document order; EPUB 3 makes the first the main title whatever a later `title-type` claims — `mainTitle(metadata)` reads it |
| `title-type`, `display-seq`, `file-as` refinements | `titles[].type` / `displaySeq` / `sortAs` | `type` lowercased, unknown values verbatim |
| `dc:description` | `description` | |
| `dc:publisher` | `publication.edition.publisher` | |
| `dc:rights` | `rights` | |
| `dc:language` | `languages` | all, document order |
| `dc:subject` | `subjects` | all, document order |
| `dc:creator`, `dc:contributor` | `contributors` | roles from `opf:role` and EPUB 3 `meta refines property="role"`, `file-as` → `sortAs` |
| `dc:date` | `publication.edition.date` | the specific EPUB publication's date, parsed as W3CDTF |
| `dc:identifier` | `identifiers` | all; EPUB 2 `opf:scheme` or EPUB 3 `identifier-type` refinement retained, otherwise recognizable ISBN/GTIN, valid absolute HTTP(S) → `URL`, or `Unknown`; the `package@unique-identifier` target has `unique: true` |
| spine `page-progression-direction` | `readingDirection` | validated |
| `rendition:layout` meta | `renditionLayout` | validated |
| `rendition:flow` meta | `renditionFlow` | validated |
| `rendition:spread` meta | `renditionSpread` | validated |
| `belongs-to-collection` metas | `belongsTo` | `collection-type` `series` → series (with `group-position`), else collection |
| `dcterms:identifier` refinement of a collection | `belongsTo.*[].identifiers` | scheme from an `identifier-type` refinement of that identifier, else inferred |
| `calibre:series` / `calibre:series_index` | `belongsTo.series` | fallback when no EPUB 3 series meta |
| every `<meta>` | `properties` | verbatim, the open-world channel |
| manifest items, spine itemrefs | `readingOrder` | structural |
| spine `toc` idref | `toc` | structural |
| cover heuristics (`coverHref`) | `cover` | the `metadata.cover` field; `basePath`-resolved by `resolveArchive`, `confidence: "derived"` |
| `<guide>` | `guide` | reserved — `sources.opf` only today |

### Apple / Kobo → metadata

| Source field | Home | Notes |
| --- | --- | --- |
| Apple `fixed-layout` option | `apple.fixedLayout` + `renditionLayout` | `true` → `pre-paginated` |
| Apple display options (all) | `apple.options` | verbatim, lossless |
| Kobo `fixed-layout` option | `kobo.fixedLayout` + `renditionLayout` | `true` → `pre-paginated` |

## Error policy & versioning

Per-source parse failures are swallowed and logged via the debug `Report` (books in the wild are dirty): a malformed `ComicInfo.xml` never fails a resolve, it just doesn't contribute. The `ResolvedArchive` entity carries a `version` field for consumers persisting it — currently `3`, reflecting the normalized identifier model. It is bumped only when the shape or meaning of existing fields changes incompatibly; additive vocabulary growth does not bump it.

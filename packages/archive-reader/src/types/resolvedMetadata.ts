/**
 * The cross-format metadata vocabulary produced by the per-source
 * `resolve*` functions and their merge (`resolveMetadata`).
 *
 * Design rules (see the per-format mapping tables next to each resolver):
 *
 * - **Union schema, not intersection** — the shape is rich enough to express
 *   what any supported format (OPF, ComicInfo, Apple/Kobo sidecars) can say;
 *   each source populates the subset it knows. Sparse results are expected:
 *   absent keys mean the source(s) had nothing to say. Empty arrays/strings
 *   collapse to absent so `field !== undefined` is a reliable presence check.
 * - **Vocabulary anchored on prior art** — field names and semantics follow
 *   the Readium Web Publication Manifest metadata
 *   (https://readium.org/webpub-manifest/) where a term exists
 *   (`contributors` roles, `belongsTo` series/collection, `numberOfPages`,
 *   `imprint`…) rather than inventing new ones.
 * - **Normalization ≠ convergence** — every field is typed/parsed/validated
 *   (booleans are booleans, positions are numbers), but concepts with no
 *   cross-format twin stay in clearly format-scoped corners ({@link
 *   ResolvedComicMetadata}, {@link ResolvedAppleMetadata},
 *   {@link ResolvedKoboMetadata}) instead of faking generic names.
 * - **Losslessness** — everything a parser captures must have a home either
 *   here or on a sibling part of the resolved archive entity (reading order,
 *   toc…). The open-ended OPF `meta` vocabulary is structurally copied into
 *   {@link ResolvedMetadata.properties} so unknown properties survive
 *   normalization; known ones get promoted into real fields over time.
 */

/**
 * Contributor role vocabulary: the Readium WPM role terms our sources can
 * express, plus the prose-reader extension `coverArtist` (ComicInfo
 * `CoverArtist` — Readium has no cover-art term). Resolvers normalize
 * well-known source tokens (ComicInfo role fields, common MARC relator
 * codes) into these; unknown source tokens pass through verbatim.
 */
export type ResolvedContributorRole =
  | "author"
  | "translator"
  | "editor"
  | "artist"
  | "illustrator"
  | "letterer"
  | "penciler"
  | "colorist"
  | "inker"
  | "narrator"
  | "contributor"
  | "coverArtist"

export type ResolvedContributor = {
  readonly name: string
  /**
   * Normalized role terms (see {@link ResolvedContributorRole}), in source
   * order; unknown tokens (e.g. unmapped MARC relator codes) are kept
   * verbatim. A `dc:creator` without any role defaults to `author`; a
   * `dc:contributor` without any role defaults to `contributor`.
   */
  readonly roles: ReadonlyArray<ResolvedContributorRole | (string & {})>
  /** Sorting form of the name (OPF `file-as`). */
  readonly sortAs?: string
}

/**
 * Membership in a series or collection (Readium `belongsTo` shape).
 * `total` is a prose-reader extension: the announced number of entries in
 * the collection (ComicInfo `Count`), useful to library apps.
 */
export type ResolvedCollection = {
  readonly name: string
  /** Position of this publication in the collection; floats allowed ("1.5"). */
  readonly position?: number
  /** Announced total number of entries in the collection. */
  readonly total?: number
}

/**
 * Calendar components of a date. Each component is independently optional
 * so partial dates (year only, year+month) round-trip faithfully.
 */
export type ResolvedDate = {
  readonly year?: number
  readonly month?: number
  readonly day?: number
}

/**
 * One entry of the open-world property channel — structurally the OPF
 * `<meta>` shape (EPUB 3 `property`/`refines`/`value`, EPUB 2
 * `name`/`content`), copied verbatim so open vocabularies (calibre columns,
 * vendor namespaces…) survive normalization losslessly.
 */
export type ResolvedProperty = {
  readonly property?: string
  readonly refines?: string
  readonly scheme?: string
  readonly id?: string
  readonly name?: string
  readonly content?: string
  readonly value?: string
}

/**
 * ComicInfo-scoped concepts with no cross-format twin. Normalized (typed,
 * parsed), but deliberately not renamed into pseudo-generic fields.
 */
export type ResolvedComicMetadata = {
  /** `Manga` is `Yes`/`YesAndRightToLeft` → true, `No` → false. */
  readonly manga?: boolean
  /** `BlackAndWhite` `Yes` → true, `No` → false. */
  readonly blackAndWhite?: boolean
  /** `Volume`, when numeric. */
  readonly volume?: number
  /** `Format` verbatim (trimmed), e.g. `TPB`, `One-Shot`. */
  readonly format?: string
  /** `AgeRating` verbatim (trimmed); the schema enum is loose in the wild. */
  readonly ageRating?: string
  /** `CommunityRating`, when numeric (schema range 0–5). */
  readonly communityRating?: number
  readonly notes?: string
  readonly review?: string
  /** `Web`, split on whitespace (the schema allows several URLs). */
  readonly web?: ReadonlyArray<string>
  readonly scanInformation?: string
  readonly mainCharacterOrTeam?: string
  /** `Characters`, split on commas. */
  readonly characters?: ReadonlyArray<string>
  /** `Teams`, split on commas. */
  readonly teams?: ReadonlyArray<string>
  /** `Locations`, split on commas. */
  readonly locations?: ReadonlyArray<string>
  /**
   * `StoryArc` (+ `StoryArcNumber`), both comma-split and zipped
   * positionally per the de-facto convention: `StoryArc="A,B"` with
   * `StoryArcNumber="1,3"` → A at 1, B at 3.
   */
  readonly storyArcs?: ReadonlyArray<ResolvedCollection>
  /** `AlternateSeries` (+ `AlternateNumber`/`AlternateCount`). */
  readonly alternateSeries?: ResolvedCollection
}

/**
 * Apple display-options corner. `options` is the lossless copy of every
 * option; `fixedLayout` is the normalized view of the `fixed-layout` one.
 */
export type ResolvedAppleMetadata = {
  readonly fixedLayout?: boolean
  readonly options?: ReadonlyArray<{
    readonly name?: string
    readonly value: string
  }>
}

/** Kobo display-options corner. */
export type ResolvedKoboMetadata = {
  readonly fixedLayout?: boolean
}

/**
 * How sure the resolver is about a value it produced:
 *
 * - `derived` — the container states it outright *or* it is computed from the
 *   container's actual content (e.g. an OPF-declared cover, a page count read
 *   from ComicInfo or counted from the pages). A value we know.
 * - `assumed` — the container does not state it and it cannot be computed, so
 *   the resolver applies a sensible convention. A best-effort opinion the
 *   consumer may want to flag, or let the user confirm.
 *
 * Only carried on fields that actually have an `assumed` path; fields that are
 * always `derived` (or always absent when unknown) do not carry it.
 */
export type ResolvedConfidence = "derived" | "assumed"

/**
 * The publication's cover image. Determining it from a container needs the
 * container itself, not just its descriptive sidecars, so within this package
 * only `resolveArchive` populates it.
 */
export type ResolvedCover = {
  /**
   * Addressed in the coordinate space of whoever resolved it: a container
   * record `uri` when it comes from an archive — rebase into your own serving
   * space, like reading order uris — or an absolute url when it comes from a
   * remote catalog (`@prose-reader/metadata-fetcher`), which addresses its
   * covers in its own space and has nothing to be rebased onto.
   */
  readonly uri: string
  /**
   * Best-effort media type of the cover resource, from the archive record's
   * encoding format when known, else detected from the filename. Absent when
   * neither yields one.
   */
  readonly mediaType?: string
  /**
   * `derived` when the OPF references this image as the cover; `assumed` when
   * the archive declares none and this is the package-less first-page
   * convention. See {@link ResolvedConfidence}.
   */
  readonly confidence: ResolvedConfidence
}

/**
 * @see module doc above for design rules.
 */
export type ResolvedMetadata = {
  /** Human-readable title of the work. OPF `dc:title`, ComicInfo `Title`. */
  readonly title?: string
  /**
   * The publication's cover image: the OPF-declared cover (EPUB 3
   * `cover-image` property, the EPUB 2 `<meta name="cover">` convention, or a
   * `cover`-ish image id), else the first page of a package-less container
   * (CBZ, folder of images). Resolved against the container, so it is
   * populated by `resolveArchive` and left absent by the source-level
   * resolvers, which never see the file listing — a remote catalog is the
   * other way to obtain one. See {@link ResolvedCover}.
   */
  readonly cover?: ResolvedCover
  /** OPF `dc:description`, ComicInfo `Summary`. */
  readonly description?: string
  /** OPF first non-empty `dc:publisher`, ComicInfo `Publisher`. */
  readonly publisher?: string
  /** ComicInfo `Imprint` (Readium term; OPF has no dedicated element). */
  readonly imprint?: string
  /** Rights/copyright statement. OPF `dc:rights`; ComicInfo has none. */
  readonly rights?: string
  /**
   * Language tags. OPF every `dc:language` (BCP 47); ComicInfo
   * `LanguageISO` lifted into a single-entry array.
   */
  readonly languages?: ReadonlyArray<string>
  /**
   * Subject keywords. OPF every `dc:subject`; ComicInfo `Genre` then
   * `Tags`, both comma-split.
   */
  readonly subjects?: ReadonlyArray<string>
  /**
   * People and organizations, with normalized role attribution. OPF
   * `dc:creator`/`dc:contributor` (roles from `opf:role` and EPUB 3
   * `refines`); ComicInfo `Writer`/`Penciller`/`Inker`/`Colorist`/
   * `Letterer`/`CoverArtist`/`Editor`/`Translator` (one entry per person,
   * roles merged when the same name appears in several fields).
   */
  readonly contributors?: ReadonlyArray<ResolvedContributor>
  /** Publication date. OPF `dc:date` (W3CDTF); ComicInfo `Year`/`Month`/`Day`. */
  readonly published?: ResolvedDate
  /**
   * OPF spine `page-progression-direction`, ComicInfo `Manga`
   * (`YesAndRightToLeft` → rtl). See `resolveMetadata` for precedence.
   */
  readonly readingDirection?: "ltr" | "rtl"
  /**
   * OPF `rendition:layout` meta, Apple/Kobo `fixed-layout` display options.
   * Validated values only.
   */
  readonly renditionLayout?: "reflowable" | "pre-paginated"
  /** OPF `rendition:flow` meta, validated values only (no defaulting here). */
  readonly renditionFlow?:
    | "scrolled-continuous"
    | "scrolled-doc"
    | "paginated"
    | "auto"
  /** OPF `rendition:spread` meta, validated values only (no defaulting here). */
  readonly renditionSpread?: "none" | "landscape" | "portrait" | "both" | "auto"
  /**
   * Number of pages (schema.org `numberOfPages`). ComicInfo `PageCount` when
   * declared, else the count of page-like reading-order items — images and
   * fixed-layout documents (comics, image archives, fixed layout). Reflowable
   * documents are not pages, and audio/video tracks are not pages either, so
   * both are excluded; a reflowable book or an audiobook has no page count.
   * Counting needs the container, so the counted value is only populated by
   * `resolveArchive`.
   */
  readonly numberOfPages?: number
  /** Digits-only GTIN when a source identifier matches a GS1 length (8/12/13/14). */
  readonly gtin?: string
  readonly isbn?: string
  /**
   * Raw identifiers, trimmed, with their announced scheme when present.
   * OPF every `dc:identifier`; ComicInfo `GTIN` (scheme `GTIN`).
   */
  readonly identifiers?: ReadonlyArray<{
    readonly value: string
    readonly scheme?: string
  }>
  /**
   * Series/collection membership (Readium `belongsTo`). OPF EPUB 3
   * `belongs-to-collection` metas (`collection-type` `series` versus other)
   * with calibre `calibre:series`/`calibre:series_index` as fallback;
   * ComicInfo `Series`/`Number`/`Count` and `SeriesGroup`.
   */
  readonly belongsTo?: {
    readonly series?: ReadonlyArray<ResolvedCollection>
    readonly collection?: ReadonlyArray<ResolvedCollection>
  }
  /**
   * Open-world property channel: every OPF `<meta>` entry, verbatim
   * (see {@link ResolvedProperty}). Lossless by construction.
   */
  readonly properties?: ReadonlyArray<ResolvedProperty>
  readonly comic?: ResolvedComicMetadata
  readonly apple?: ResolvedAppleMetadata
  readonly kobo?: ResolvedKoboMetadata
}

/**
 * Where a parsed source field lands: a {@link ResolvedMetadata} field
 * (dotted paths address the scoped corners), or a sibling part of the
 * resolved archive entity for structural fields (`readingOrder`, `toc`).
 * `guide` is a reserved home for an entity part that only exists as raw
 * `sources` today — tracked, not yet promoted. (`cover` used to be reserved
 * here too; it is now the {@link ResolvedMetadata.cover} field.)
 *
 * Used by the per-format mapping tables (`opfMetadataHomes`,
 * `comicInfoMetadataHomes`, …) that compile-enforce the losslessness rule:
 * adding a parser field without declaring its home is a type error.
 */
export type ResolvedMetadataHome =
  | Exclude<keyof ResolvedMetadata, "comic" | "apple" | "kobo" | "belongsTo">
  | `comic.${keyof ResolvedComicMetadata}`
  | `apple.${keyof ResolvedAppleMetadata}`
  | `kobo.${keyof ResolvedKoboMetadata}`
  | `belongsTo.${"series" | "collection"}`
  | "readingOrder"
  | "toc"
  | "guide"

# Publication identifiers

Archive-reader normalizes identifiers from supported publication metadata into a shared shape:

```typescript
{
  value: string
  scheme: MetadataIdentifierScheme
}
```

The `value` is preserved as authored. The `scheme` describes the identifier namespace when the publication states one or its syntax can be identified reliably.

## How schemes are resolved

| Source value | Resolved scheme |
| --- | --- |
| Explicit EPUB 2 `opf:scheme` or EPUB 3 `identifier-type` | The canonical known scheme or the authored custom scheme |
| Recognizable untyped ISBN or GTIN | `ISBN` or `GTIN` |
| Absolute HTTP(S) URL | `URL` |
| Other untyped value | `Unknown` |

The built-in scheme vocabulary includes `ISBN`, `GTIN`, `DOI`, `GoogleBooks`, `OpenLibrary`, `ProjectGutenberg`, `URL`, and the `Unknown` fallback. Applications can also use a custom scheme string for a namespace that is not in `KnownMetadataIdentifierScheme`.

`Unknown` means the publication supplied an identifier value without enough information to determine its namespace. The value is preserved instead of being guessed or discarded.

A URL remains a URL identifier, including when its query or path contains another catalog's identifier. Archive-reader does not replace the authored URL with an identifier extracted from it.

## Reading a specific identifier

`identifiers` is a list, so answering "what is this publication's ISBN?" means selecting the entries whose scheme can carry one and normalizing the authored value. Two exported helpers do exactly that:

```typescript
import {
  gtinIdentifierValue,
  isbnIdentifierValue,
} from "@prose-reader/archive-reader"

const isbn = isbnIdentifierValue(metadata.identifiers) // "9780441013593" | undefined
const gtin = gtinIdentifierValue(metadata.identifiers) // "9780441013593" | undefined
```

Both accept `ISBN` **and** `GTIN` identifiers, because the two are one namespace in practice: an ISBN-13 *is* a GTIN-13 in the Bookland (`978`/`979`) range, and [ComicInfo](#comicinfo) has no ISBN field at all — a comic announces its ISBN through `GTIN`, which stays labelled `GTIN` because that is what the source said. Filtering on `scheme === "ISBN"` therefore silently misses every comic ISBN, and filtering on `GTIN` misses every EPUB one. `isIsbnBearingScheme(scheme)` is exported for code that needs the same scheme test on its own.

The authored `value` needs normalizing before use: it is preserved as the publication wrote it, so it arrives hyphenated (`978-0-441-01359-3`), prefixed (`urn:isbn:9780441013593`), or padded with free text. The helpers return the canonical form — 10 or 13 characters for an ISBN, digits only for a GTIN.

`isbnIdentifierValue` also declines a value that is not a book number, whichever scheme announced it. A retail barcode scanned off a comic's cover (`4006381333931`) is a valid GTIN-13 but sits outside the Bookland range, so it is not reported as an ISBN even when the publication labels it `opf:scheme="ISBN"`. A barcode of another GTIN length is not reduced to its leading digits either: no ISBN is carved out of a longer number the publication printed. Only the derivation declines — the identifier itself stays in `identifiers` exactly as authored, so nothing is lost. Check digits are not verified: a mistyped one still identifies the intended book.

## EPUB and OPF

Every non-empty OPF `dc:identifier` is retained. EPUB 3 can explicitly type an identifier with an `identifier-type` refinement:

```xml
<dc:identifier id="catalog-id">catalog-42</dc:identifier>
<meta refines="#catalog-id" property="identifier-type">
  ExampleCatalog
</meta>
```

This resolves to:

```typescript
{
  value: "catalog-42",
  scheme: "ExampleCatalog",
}
```

The identifier referenced by the OPF package's `unique-identifier` attribute also receives `unique: true` in resolved archive metadata.

For EPUBs that include Apple or Kobo display-option files, the OPF package document remains the identifier source. Those sidecars describe presentation and do not define bibliographic identifier fields.

## ComicInfo

ComicInfo has dedicated fields rather than a generic typed identifier collection:

- `GTIN` becomes a `GTIN` identifier. ComicInfo has no ISBN field, so a comic's ISBN arrives here; the scheme stays faithful to the source and [`isbnIdentifierValue`](#reading-a-specific-identifier) reads the ISBN out of it.
- [`Web`](https://anansi-project.github.io/docs/comicinfo/documentation#web) accepts space-separated reference URLs. Every valid absolute HTTP(S) value becomes a `URL` identifier and is also retained under `metadata.comicInfo.web`.

Use a catalog's reference URL in `Web` when a comic archive needs to identify an external catalog entry without being converted to EPUB or using a vendor-specific extension.

See [Google Books identifiers](google-books.md) and [Project Gutenberg identifiers](project-gutenberg.md) for concrete catalog examples.

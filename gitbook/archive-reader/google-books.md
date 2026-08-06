# Google Books identifiers

Archive-reader does not call Google Books. It recognizes and normalizes Google Books identifiers embedded in EPUB metadata so the result can be passed directly to [metadata-fetcher's Google Books provider](../metadata-fetcher/README.md#google-books) for an exact catalog lookup.

## Typed EPUB 3 identifier

The authoritative form gives the `dc:identifier` an `id` and refines it with the EPUB 3 `identifier-type` property:

```xml
<dc:identifier id="google-books-id">k028AAAACAAJ</dc:identifier>
<meta refines="#google-books-id" property="identifier-type">
  GoogleBooks
</meta>
```

Archive-reader resolves it as:

```typescript
{
  value: "k028AAAACAAJ",
  scheme: "GoogleBooks",
}
```

The raw volume id is opaque, so the refinement is what identifies its namespace.

## Official Google Books URL

### EPUB

An EPUB can carry an official Google Books URL instead of a typed raw id:

```xml
<dc:identifier>
  https://books.google.com/books?id=k028AAAACAAJ
</dc:identifier>
```

Archive-reader preserves the URL and classifies its literal form:

```typescript
{
  value: "https://books.google.com/books?id=k028AAAACAAJ",
  scheme: "URL",
}
```

The Google Books provider recognizes official Google Books website and API URLs, extracts the volume id, and performs the same exact lookup as it does for the typed identifier. It rejects unrelated domains and URLs authored with a conflicting scheme.

### ComicInfo

ComicInfo already defines [`Web`](https://anansi-project.github.io/docs/comicinfo/documentation#web) as one or more space-separated reference URLs for the book. A CBZ can therefore carry the same exact Google Books reference without being converted to EPUB or using a vendor extension:

```xml
<ComicInfo>
  <Web>https://books.google.com/books?id=k028AAAACAAJ</Web>
</ComicInfo>
```

Archive-reader retains the value under `metadata.comic.web` and also promotes each valid absolute HTTP(S) value to a normalized identifier:

```typescript
{
  value: "https://books.google.com/books?id=k028AAAACAAJ",
  scheme: "URL",
}
```

That identifier is forwarded unchanged to metadata-fetcher, whose Google Books provider extracts the volume id and performs the exact lookup. The same standard `Web` mechanism works for an official Project Gutenberg URL, and multiple catalog URLs can coexist in the field separated by spaces.

## Untyped raw identifiers

Without either the EPUB 3 refinement or an official URL, archive-reader cannot safely infer that an opaque value belongs to Google Books:

```xml
<dc:identifier>k028AAAACAAJ</dc:identifier>
```

It is preserved losslessly rather than guessed:

```typescript
{
  value: "k028AAAACAAJ",
  scheme: "Unknown",
}
```

Applications that already know the value came from Google Books should provide `{ value: "k028AAAACAAJ", scheme: "GoogleBooks" }` when constructing metadata directly.

The [ComicInfo 2.1 schema](https://anansi-project.github.io/docs/comicinfo/schemas/v2.1) has `GTIN` and `Web`, but no generic typed identifier collection. `GTIN` must not be repurposed for a Google Books id. Supporting opaque raw catalog ids inside `ComicInfo.xml` would require an upstream schema addition or a vendor-specific extension; it is unnecessary for Google Books and Project Gutenberg because both have canonical URLs supported by `Web`.

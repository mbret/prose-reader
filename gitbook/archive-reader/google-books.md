# Google Books identifiers

Archive-reader recognizes and normalizes Google Books identifiers embedded in archive metadata. It does not contact Google or verify that a volume exists.

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

Archive-reader does not extract or relabel the volume id from the URL. It preserves the authored value as a general `URL` identifier.

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

Multiple reference URLs can coexist in `Web`, separated by spaces. Every valid absolute HTTP(S) value is preserved as its own `URL` identifier.

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

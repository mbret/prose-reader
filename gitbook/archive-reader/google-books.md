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

An EPUB can instead carry an official Google Books URL:

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

# Google Books identifiers

Archive-reader recognizes `GoogleBooks` as a known identifier scheme when a publication states it explicitly. A publication can also carry a Google Books reference as a general `URL` identifier.

| Publication metadata | Resolved identifier |
| --- | --- |
| EPUB 3 identifier explicitly typed `GoogleBooks` | `{ value: id, scheme: "GoogleBooks" }` |
| Absolute Google Books URL in an EPUB identifier | `{ value: url, scheme: "URL" }` |
| Absolute Google Books URL in ComicInfo `Web` | `{ value: url, scheme: "URL" }` |
| Untyped opaque Google Books id | `{ value: id, scheme: "Unknown" }` |

## Explicitly typed EPUB identifier

EPUB 3 can state the identifier namespace directly:

```xml
<dc:identifier id="google-books-id">k028AAAACAAJ</dc:identifier>
<meta refines="#google-books-id" property="identifier-type">
  GoogleBooks
</meta>
```

Archive-reader preserves the value and canonicalizes the known scheme spelling:

```typescript
{
  value: "k028AAAACAAJ",
  scheme: "GoogleBooks",
}
```

This is the most precise representation because the publication explicitly says what assigned the otherwise opaque value.

## Reference URL

Publications can carry a catalog reference without assigning a specialized identifier scheme.

In EPUB metadata:

```xml
<dc:identifier>
  https://books.google.com/books?id=k028AAAACAAJ
</dc:identifier>
```

In a CBZ or CBR `ComicInfo.xml`, the standard [`Web`](https://anansi-project.github.io/docs/comicinfo/documentation#web) field provides the equivalent representation:

```xml
<ComicInfo>
  <Web>https://books.google.com/books?id=k028AAAACAAJ</Web>
</ComicInfo>
```

Both resolve to the literal URL:

```typescript
{
  value: "https://books.google.com/books?id=k028AAAACAAJ",
  scheme: "URL",
}
```

Archive-reader normalizes an absolute HTTP(S) value generically as `URL` and preserves the complete authored value. ComicInfo keeps it under `metadata.comic.web` as well, and its `Web` field can contain multiple space-separated reference URLs.

## What this illustrates generally

The same identifier model applies beyond Google Books:

- EPUB `dc:identifier` can use an EPUB 3 `identifier-type` refinement to announce a known or application-specific namespace.
- ComicInfo provides `GTIN` for product identifiers and `Web` for reference URLs; it has no generic typed identifier collection.
- Valid absolute HTTP(S) identifiers become scheme `URL`, independently of their host.
- Archive-reader only infers schemes from values when the syntax is dependable, currently ISBN, GTIN, and absolute HTTP(S) URLs.
- An opaque untyped value is preserved as `Unknown` instead of being guessed or discarded.
- Custom scheme strings remain valid even when they are not part of `KnownMetadataIdentifierScheme`.

For EPUBs—including EPUBs carrying Apple or Kobo display-option files—the OPF package document is the identifier source. Apple and Kobo sidecars describe presentation and do not define bibliographic identifier fields.

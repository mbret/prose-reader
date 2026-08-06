# Project Gutenberg identifiers

Archive-reader recognizes `ProjectGutenberg` as a known identifier scheme when a publication states it explicitly. A publication can also carry a Project Gutenberg reference as a general `URL` identifier.

| Publication metadata | Resolved identifier |
| --- | --- |
| EPUB 3 identifier explicitly typed `ProjectGutenberg` | `{ value: id, scheme: "ProjectGutenberg" }` |
| Absolute Gutenberg URL in an EPUB identifier | `{ value: url, scheme: "URL" }` |
| Absolute Gutenberg URL in ComicInfo `Web` | `{ value: url, scheme: "URL" }` |
| Untyped opaque Gutenberg ebook number | `{ value: id, scheme: "Unknown" }` |

## Explicitly typed EPUB identifier

EPUB 3 can state the identifier namespace directly:

```xml
<dc:identifier id="gutenberg-id">78139</dc:identifier>
<meta refines="#gutenberg-id" property="identifier-type">
  ProjectGutenberg
</meta>
```

Archive-reader preserves the value and canonicalizes the known scheme spelling:

```typescript
{
  value: "78139",
  scheme: "ProjectGutenberg",
}
```

This is the most precise representation because the publication explicitly says what assigned the otherwise ambiguous number.

## Reference URL

Publications can carry a catalog reference without assigning a specialized identifier scheme.

In EPUB metadata:

```xml
<dc:identifier>https://www.gutenberg.org/ebooks/78139</dc:identifier>
```

In a CBZ or CBR `ComicInfo.xml`, the standard [`Web`](https://anansi-project.github.io/docs/comicinfo/documentation#web) field provides the equivalent representation:

```xml
<ComicInfo>
  <Web>https://www.gutenberg.org/ebooks/78139</Web>
</ComicInfo>
```

Both resolve to the literal URL:

```typescript
{
  value: "https://www.gutenberg.org/ebooks/78139",
  scheme: "URL",
}
```

Archive-reader normalizes an absolute HTTP(S) value generically as `URL` and preserves the complete authored value. ComicInfo keeps it under `metadata.comic.web` as well, and its `Web` field can contain multiple space-separated reference URLs.

## What this illustrates generally

The same identifier model applies beyond Project Gutenberg:

- EPUB `dc:identifier` can use an EPUB 3 `identifier-type` refinement to announce a known or application-specific namespace.
- ComicInfo provides `GTIN` for product identifiers and `Web` for reference URLs; it has no generic typed identifier collection.
- Valid absolute HTTP(S) identifiers become scheme `URL`, independently of their host.
- Archive-reader only infers schemes from values when the syntax is dependable, currently ISBN, GTIN, and absolute HTTP(S) URLs.
- An opaque untyped value is preserved as `Unknown` instead of being guessed or discarded.
- Custom scheme strings remain valid even when they are not part of `KnownMetadataIdentifierScheme`.

For EPUBs—including EPUBs carrying Apple or Kobo display-option files—the OPF package document is the identifier source. Apple and Kobo sidecars describe presentation and do not define bibliographic identifier fields.

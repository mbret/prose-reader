# Project Gutenberg identifiers

Archive-reader does not call Project Gutenberg. It recognizes and normalizes Gutenberg identifiers embedded in archive metadata so the result can be passed directly to [metadata-fetcher's Project Gutenberg provider](../metadata-fetcher/README.md#project-gutenberg) for an exact catalog lookup.

## Typed EPUB 3 identifier

An EPUB can identify a raw Gutenberg ebook number with an `identifier-type` refinement:

```xml
<dc:identifier id="gutenberg-id">78139</dc:identifier>
<meta refines="#gutenberg-id" property="identifier-type">
  ProjectGutenberg
</meta>
```

Archive-reader resolves it as:

```typescript
{
  value: "78139",
  scheme: "ProjectGutenberg",
}
```

## Official Project Gutenberg URL

### EPUB

An EPUB can instead carry the public ebook page:

```xml
<dc:identifier>https://www.gutenberg.org/ebooks/78139</dc:identifier>
```

Archive-reader preserves the literal URL:

```typescript
{
  value: "https://www.gutenberg.org/ebooks/78139",
  scheme: "URL",
}
```

The Project Gutenberg provider recognizes official `/ebooks/{id}`, `/files/{id}/…`, `/cache/epub/{id}/…`, and legacy `/{id}` URLs. It extracts the numeric ebook id and fetches the corresponding RDF record for an exact lookup.

### ComicInfo

ComicInfo archives use the standard `Web` reference field, so a CBZ or CBR needs no EPUB package or vendor extension:

```xml
<ComicInfo>
  <Web>https://www.gutenberg.org/ebooks/78139</Web>
</ComicInfo>
```

Archive-reader retains the value under `metadata.comic.web` and also promotes it to `{ value: "https://www.gutenberg.org/ebooks/78139", scheme: "URL" }`. `metadataInputFromResolvedArchive` forwards that identifier unchanged to metadata-fetcher.

## Untyped raw identifiers

A bare numeric value does not announce that Project Gutenberg assigned it:

```xml
<dc:identifier>78139</dc:identifier>
```

Archive-reader therefore preserves it with scheme `Unknown` instead of guessing. Use the typed EPUB refinement, the official URL, or `{ value: "78139", scheme: "ProjectGutenberg" }` when constructing metadata directly.

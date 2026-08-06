# Project Gutenberg identifiers

Archive-reader recognizes and normalizes Project Gutenberg identifiers embedded in archive metadata. It does not contact Gutenberg or verify that an ebook exists.

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

Archive-reader does not extract or relabel the ebook number from the URL. It preserves the authored value as a general `URL` identifier.

### ComicInfo

ComicInfo archives use the standard `Web` reference field, so a CBZ or CBR needs no EPUB package or vendor extension:

```xml
<ComicInfo>
  <Web>https://www.gutenberg.org/ebooks/78139</Web>
</ComicInfo>
```

Archive-reader retains the value under `metadata.comic.web` and also promotes it to `{ value: "https://www.gutenberg.org/ebooks/78139", scheme: "URL" }`. Multiple reference URLs can coexist in `Web`, separated by spaces.

## Untyped raw identifiers

A bare numeric value does not announce that Project Gutenberg assigned it:

```xml
<dc:identifier>78139</dc:identifier>
```

Archive-reader therefore preserves it with scheme `Unknown` instead of guessing. Use the typed EPUB refinement, the official URL, or `{ value: "78139", scheme: "ProjectGutenberg" }` when constructing metadata directly.

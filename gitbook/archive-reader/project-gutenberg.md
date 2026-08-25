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

Archive-reader normalizes an absolute HTTP(S) value generically as `URL` and preserves the complete authored value. ComicInfo keeps it under `metadata.comicInfo.web` as well, and its `Web` field can contain multiple space-separated reference URLs.

## Reading the ebook number

Because the same identifier arrives either explicitly typed or as a reference URL, read it with `catalogIdentifierValue` rather than filtering on the scheme:

```typescript
import { catalogIdentifierValue } from "@prose-reader/archive-reader"

const id = catalogIdentifierValue(metadata.identifiers, "ProjectGutenberg")
// "78139" | undefined
```

That answers for both representations above. Filtering on `scheme === "ProjectGutenberg"` misses every publication — comics especially — that stated the reference as a URL.

See [Publication identifiers](identifiers.md) for the shared scheme resolution rules, custom schemes, URLs, and the `Unknown` fallback.

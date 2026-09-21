# Open Library identifiers

Archive-reader recognizes `OpenLibrary` as a known identifier scheme when a publication states it explicitly. A publication can also carry an Open Library reference as a general `URL` identifier.

| Publication metadata | Resolved identifier |
| --- | --- |
| EPUB 3 identifier explicitly typed `OpenLibrary` | `{ value: key, scheme: "OpenLibrary" }` |
| Absolute Open Library URL in an EPUB identifier | `{ value: url, scheme: "URL" }` |
| Absolute Open Library URL in ComicInfo `Web` | `{ value: url, scheme: "URL" }` |

## Keys, not bare ids

Open Library addresses a record by its key path, and that path is the value this scheme carries:

| Key | Record |
| --- | --- |
| `/works/OL45883W` | The work — the book as a text, across editions |
| `/books/OL7353617M` | One edition of it |
| `/authors/OL23919A` | An author |

The trailing letter says which collection an id belongs to, so a bare `OL7353617M` is unambiguous and is canonicalized to `/books/OL7353617M`.

## Explicitly typed EPUB identifier

```xml
<dc:identifier id="open-library-id">/works/OL45883W</dc:identifier>
<meta refines="#open-library-id" property="identifier-type">
  OpenLibrary
</meta>
```

Resolves to:

```typescript
{
  value: "/works/OL45883W",
  scheme: "OpenLibrary",
}
```

## Reference URL

In EPUB metadata:

```xml
<dc:identifier>https://openlibrary.org/works/OL45883W</dc:identifier>
```

In a CBZ or CBR `ComicInfo.xml`:

```xml
<ComicInfo>
  <Web>https://openlibrary.org/works/OL45883W</Web>
</ComicInfo>
```

Both resolve to the literal URL:

```typescript
{
  value: "https://openlibrary.org/works/OL45883W",
  scheme: "URL",
}
```

## Reading the key

Because the same identifier arrives either explicitly typed or as a reference URL, read it with `identifierValue` rather than filtering on the scheme:

```typescript
import { identifierValue } from "@prose-reader/archive-reader"

const key = identifierValue(metadata.identifiers, "OpenLibrary")
// "/works/OL45883W" | undefined
```

A URL that names a record beyond the key — `https://openlibrary.org/books/OL7353617M/Moby_Dick` — still answers with the key alone, since the trailing slug is a title, not part of the identifier.

See [Publication identifiers](identifiers.md) for the shared scheme resolution rules, custom schemes, URLs, and the `Unknown` fallback.

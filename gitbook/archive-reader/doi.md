# DOI identifiers

Archive-reader recognizes `DOI` as a known identifier scheme when a publication states it explicitly. A publication can also carry a DOI as a general `URL` identifier, which is how the DOI resolver addresses one.

| Publication metadata | Resolved identifier |
| --- | --- |
| EPUB 3 identifier explicitly typed `DOI` | `{ value: name, scheme: "DOI" }` |
| Absolute `doi.org` URL in an EPUB identifier | `{ value: url, scheme: "URL" }` |
| Absolute `doi.org` URL in ComicInfo `Web` | `{ value: url, scheme: "URL" }` |

A DOI name is a registrant prefix and a suffix the registrant assigns — `10.1000/182`. Suffixes are opaque and case-insensitive, and carry no length limit.

## Explicitly typed EPUB identifier

```xml
<dc:identifier id="doi">10.1000/182</dc:identifier>
<meta refines="#doi" property="identifier-type">DOI</meta>
```

Resolves to:

```typescript
{
  value: "10.1000/182",
  scheme: "DOI",
}
```

## Reference URL

In EPUB metadata:

```xml
<dc:identifier>https://doi.org/10.1000/182</dc:identifier>
```

In a CBZ or CBR `ComicInfo.xml`:

```xml
<ComicInfo>
  <Web>https://doi.org/10.1000/182</Web>
</ComicInfo>
```

Both resolve to the literal URL:

```typescript
{
  value: "https://doi.org/10.1000/182",
  scheme: "URL",
}
```

## Reading the name

Because the same identifier arrives either explicitly typed or as a resolver URL, read it with `catalogIdentifierValue` rather than filtering on the scheme:

```typescript
import { catalogIdentifierValue } from "@prose-reader/archive-reader"

const doi = catalogIdentifierValue(metadata.identifiers, "DOI")
// "10.1000/182" | undefined
```

The `doi:` prefix is dropped and a percent-encoded suffix is decoded, so `doi:10.1000/182` and `https://dx.doi.org/10.1038%2Fnphys1170` both answer with the bare name.

See [Publication identifiers](identifiers.md) for the shared scheme resolution rules, custom schemes, URLs, and the `Unknown` fallback.

# Publication identifiers

Archive-reader normalizes identifiers from supported publication metadata into a shared shape:

```typescript
{
  value: string
  scheme: MetadataIdentifierScheme
}
```

The `value` is preserved as authored. The `scheme` describes the identifier namespace when the publication states one or its syntax can be identified reliably.

## How schemes are resolved

| Source value | Resolved scheme |
| --- | --- |
| Explicit EPUB 2 `opf:scheme` or EPUB 3 `identifier-type` | The canonical known scheme or the authored custom scheme |
| Recognizable untyped ISBN or GTIN | `ISBN` or `GTIN` |
| Absolute HTTP(S) URL | `URL` |
| Other untyped value | `Unknown` |

The built-in scheme vocabulary includes `ISBN`, `GTIN`, `DOI`, `GoogleBooks`, `OpenLibrary`, `ProjectGutenberg`, `URL`, and the `Unknown` fallback. Applications can also use a custom scheme string for a namespace that is not in `KnownMetadataIdentifierScheme`.

`Unknown` means the publication supplied an identifier value without enough information to determine its namespace. The value is preserved instead of being guessed or discarded.

A URL remains a URL identifier, including when its query or path contains another catalog's identifier. Archive-reader does not replace the authored URL with an identifier extracted from it.

## EPUB and OPF

Every non-empty OPF `dc:identifier` is retained. EPUB 3 can explicitly type an identifier with an `identifier-type` refinement:

```xml
<dc:identifier id="catalog-id">catalog-42</dc:identifier>
<meta refines="#catalog-id" property="identifier-type">
  ExampleCatalog
</meta>
```

This resolves to:

```typescript
{
  value: "catalog-42",
  scheme: "ExampleCatalog",
}
```

The identifier referenced by the OPF package's `unique-identifier` attribute also receives `unique: true` in resolved archive metadata.

For EPUBs that include Apple or Kobo display-option files, the OPF package document remains the identifier source. Those sidecars describe presentation and do not define bibliographic identifier fields.

## ComicInfo

ComicInfo has dedicated fields rather than a generic typed identifier collection:

- `GTIN` becomes a `GTIN` identifier.
- [`Web`](https://anansi-project.github.io/docs/comicinfo/documentation#web) accepts space-separated reference URLs. Every valid absolute HTTP(S) value becomes a `URL` identifier and is also retained under `metadata.comicInfo.web`.

Use a catalog's reference URL in `Web` when a comic archive needs to identify an external catalog entry without being converted to EPUB or using a vendor-specific extension.

See [Google Books identifiers](google-books.md) and [Project Gutenberg identifiers](project-gutenberg.md) for concrete catalog examples.

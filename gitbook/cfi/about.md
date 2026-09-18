# About

Prose provides a TypeScript library for working with EPUB Canonical Fragment Identifiers (CFI). This library provides utilities for parsing, resolving, generating, comparing, and serializing CFIs according to the EPUB CFI 1.1 specification.

## Installation

```bash
npm install @prose-reader/cfi
```

## Usage

### Parse

Parse a CFI string into a structured object.

```typescript
import { parse } from '@prose-reader/cfi'

// Parse a simple CFI
const parsed = parse('epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/2/1:3)')

// Parse a range CFI
const rangeParsed = parse('epubcfi(/6/4[chap01ref]!/4[body01],/6/4[chap01ref]!/4[body01]/10[para05])')
```

### Resolve

Resolve a CFI to a DOM node or range.

```typescript
import { resolve } from '@prose-reader/cfi'

// Resolve to a node
const result = resolve('epubcfi(/6/4[chap01ref]!/4[body01]/10[para05])', document)

// Resolve to a range
const rangeResult = resolve('epubcfi(/6/4[chap01ref]!/4[body01],/6/4[chap01ref]!/4[body01]/10[para05])', document, { asRange: true })
```

### Generate

Generate a CFI from a DOM node or position.

```typescript
import { generate } from '@prose-reader/cfi'

// Generate from a node
const cfi = generate(node)

// Generate with options
const cfiWithOptions = generate(node, {
  includeTextAssertions: true,
  textAssertionLength: 20,
  includeSideBias: 'before',
  spatialOffset: [50, 50],
  extensions: {
    'vnd.example.param': 'value'
  }
})

// Generate from a position
const positionCfi = generate({
  node: textNode,
  offset: 5,
  temporal: 30,
  spatial: [25, 75]
})

// Generate a range
const rangeCfi = generate({
  start: { node: startNode, offset: 0 },
  end: { node: endNode, offset: 10 }
})
```

### Compare

Compare two CFIs according to the EPUB CFI specification sorting rules.

```typescript
import { compare } from '@prose-reader/cfi'

// Compare two CFIs
const result = compare(
  'epubcfi(/6/4[chap01ref]!/4[body01]/10[para05])',
  'epubcfi(/6/4[chap01ref]!/4[body01]/10[para06])'
)
// Returns -1 if first CFI is before second, 0 if equal, 1 if after
```

### Serialize

Convert a parsed CFI back to a string.

```typescript
import { parse, serialize } from '@prose-reader/cfi'

// Parse and then serialize
const parsed = parse('epubcfi(/6/4[chap01ref]!/4[body01]/10[para05])')
const cfiString = serialize(parsed)
```

## API Reference

### Parse

```typescript
function parse(cfi: string): ParsedCfi
```

Parses a CFI string into a structured object. The parsed CFI can be either a simple path or a range.

### Resolve

```typescript
function resolve(
  cfi: string | ParsedCfi,
  document: Document,
  options?: ResolveOptions
): ResolveResult
```

Resolves a CFI to a DOM node or range. Options include:

* `throwOnError`: Whether to throw an error if the CFI cannot be resolved
* `asRange`: Whether to return a range instead of a single node

### Generate

```typescript
function generate(
  position: Node | CfiPosition | { start: CfiPosition; end: CfiPosition },
  options?: GenerateOptions
): string
```

Generates a CFI from a DOM node or position. Options include:

* `includeTextAssertions`: Whether to include text assertions
* `textAssertionLength`: Maximum length of text to use for assertions
* `includeSideBias`: Whether to include a side bias assertion
* `spatialOffset`: Spatial coordinates for image/video content
* `extensions`: Extension parameters to include

### Compare

```typescript
function compare(a: ParsedCfi | string, b: ParsedCfi | string): number
```

Compares two CFIs according to the EPUB CFI specification sorting rules. Returns:

* -1 if first CFI is before second
* 0 if CFIs are equal
* 1 if first CFI is after second

### Serialize

```typescript
function serialize(parsed: ParsedCfi): string
```

Converts a parsed CFI back to a string representation.

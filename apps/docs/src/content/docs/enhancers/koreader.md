---
title: "KOReader"
---

This enhancer connects a reader to the KOReader ecosystem: it opens a reader
at, or navigates to, the **`progress`** a KOReader sync server stores for a
book, and converts a cfi, such as the reading position, to one. The `progress` is a crengine xpointer
for an EPUB and a page number for a PDF or a comic archive, the form
KOReader's own sync plugin uses for the same file, and the enhancer picks it
from the book, so a sync client never has to. The conversions themselves come
from [`@prose-reader/koreader`](/koreader); this enhancer is what ties them to
a live reader.

## Getting Started

```bash
npm install @prose-reader/enhancer-koreader @prose-reader/core rxjs
```

```typescript
import { createReader } from "@prose-reader/core"
import { koreaderEnhancer } from "@prose-reader/enhancer-koreader"

const createAppReader = koreaderEnhancer(createReader)

const reader = createAppReader({ manifest })
```

## What a book's progress is

KOReader's sync plugin writes `progress` in the form of the engine that opened
the book, and KOReader picks the engine from the file's extension. The
enhancer reads the same thing from the manifest's `mediaType`, which the
streamer resolves from the archive's `encodingFormat` and `filename` (see
[Resolving a publication](/archive-reader#resolving-a-publication)).

| Book | KOReader opens it with | `progress` | Example |
| --- | --- | --- | --- |
| EPUB | crengine | an xpointer | `/body/DocFragment[14]/body/div/p[3]/text().42` |
| PDF | MuPDF | the page number, from 1 | `"12"` |
| CBZ, CBR, CBT | MuPDF | the page number, from 1 | `"12"` |
| Plain ZIP | the engine its first file calls for | none, unless you give it a comic's media type | |
| Anything else, plain text included | | none | |

KOReader opens a plain ZIP with the engine its first file calls for: MuPDF for
an image or a PDF, crengine for a text, a page of HTML or an XML file, such as
a `ComicInfo.xml` stored before the images. Its media type does not tell
which, so the enhancer gives a ZIP no `progress`. When you know a ZIP opens as
a comic in KOReader, give its manifest a comic's media type:

```typescript
const reader = createAppReader({
  manifest: { ...manifest, mediaType: "application/vnd.comicbook+zip" },
})
```

A plain text file is opened with crengine too, but crengine builds its own
document from the text, with paragraphs and headings it detects, and no
xpointer into it can be computed from the text prose shows. Give the archive
its `filename` or `encodingFormat` when you create it, a list of URLs
included: a comic nothing tells the type of is `application/octet-stream`,
which has no `progress`.

A KOReader user can choose MuPDF for a single EPUB, which then syncs page
numbers. Nothing in the file says so, and such a book's pages are MuPDF's
layout of it, which prose does not reproduce: its page numbers are ignored.

## Going to a progress

```typescript
reader.navigation.goToKoreaderProgress("/body/DocFragment[14]/body/div/p[3]/text().42")
reader.navigation.goToKoreaderProgress("12")

// or, like any other target
reader.navigation.navigate({
  target: { type: "koreaderProgress", value: "12" },
})
```

An xpointer names its spine item, which the reader goes to at once, and a
place in its document, which it finds once that document is loaded, even when
the chapter was not loaded when the navigation started. A page number goes to
the spine item showing that page. A value of the other form than the book's,
a page the book does not have, or a pointer outside the book is ignored.
`goToKoreaderProgress` never animates.

### Opening at a progress

A sync client opens a book at the `progress` it pulled. Give it as the
reader's `target`:

```typescript
const reader = createAppReader({
  manifest,
  target: { type: "koreaderProgress", value: progress },
})
```

The reader opens there the way it
[opens at any target](/learn/navigation#opening-the-book-somewhere): its
reading position never passes through the start of the book, even for an
xpointer into a chapter that is not loaded yet. A stale xpointer whose chapter
is still there opens that chapter, as a stale cfi does: once the chapter has
loaded without its place, the reading position is its first page. A `progress`
the reader would ignore when going to it, such as a page the book does not
have, opens the book at its start.

## The reading position as a progress

```typescript
reader.navigation.readingPosition$.subscribe(
  ({ cfi, percentageEstimateOfBook }) => {
    const progress = reader.koreader.cfiToProgress(cfi)

    // push the progress and its percentage to a KOReader sync server
  },
)
```

`reader.koreader.cfiToProgress(cfi)` is the `progress` of a cfi. Convert the
reading position as it comes, and push it the way the
[navigation guide](/learn/navigation#saving-it) says to save it. A page
converts at once. A cfi naming a chapter of an EPUB converts at once, and one
naming a place in its text needs the chapter's document, which is loaded by
the time the reading position names that place. It returns `undefined` when
there is no `progress` to push: a place in a chapter that is not loaded, a cfi
naming nothing in the book, or any cfi of a book prose has no KOReader
progress for.

A sync server files the position under the book's `document` digest, which
`@prose-reader/koreader` computes from the book file: see
[Document digests](/koreader/document-digests).

## Page numbers

Page `N` is the `N`th archive record the book shows, in reading order, which
the enhancer reads from the manifest's `containerUri`:

- **PDF**: its page. prose shows one spine item per page, in page order.
- **Comic archive**: its image. A panorama the
  [cbz streamer hooks](/enhancers/cbz-and-comics-archives#page-spread-splitting)
  split into two spine items is one page, as KOReader shows it: both halves
  report it, and going to it shows the first half. This holds with the cbz
  enhancer, whose cfis name the panorama rather than the half.

:::caution
For a comic, this takes prose's reading order for KOReader's. KOReader numbers
a comic's pages with MuPDF, which sorts the images by name, numbers as numbers
and case ignored, and skips entries that are not images. prose reads a comic in
the archive's order, or sorted with `orderByAlpha`, and shows every entry, so a
page number names another image when the two disagree
([#535](https://github.com/mbret/prose-reader/issues/535)). They agree for a
comic holding only images whose names sort the same way in both, such as
`001.jpg`, `002.jpg`, read with `orderByAlpha` or stored in that order.
:::

## The reading position, whatever the target

The reading position is what the
[navigation guide](/learn/navigation#reading-position) says, whatever the
target, KOReader progresses included:

- On the way to an xpointer whose chapter is loading, it stands in at the
  chapter's start. Once the chapter shows the place, it is that place, a
  `success` once the page holding it is laid out.
- When an xpointer's place cannot be found once its chapter has loaded, a stale
  one for instance, the reader goes to the chapter's first page, and that page
  is the reading position.

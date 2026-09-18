# KOReader positions

**`@prose-reader/koreader`** converts reading positions between prose's EPUB CFIs and the **crengine XPointer** dialect that KOReader and the KOReader-sync ecosystem exchange (KOReader itself, Readest, Crosspoint, Kavita, Komga, Calibre-Web Automated, …). Both formats name the same three things: a spine item, a DOM node inside it and an offset. The conversion is a DOM walk in each direction plus the handful of normalisation rules crengine applies when it parses a spine item.

The package is pure: it takes strings and `Document` / `Node` objects and returns strings. No reader instance, no I/O, no sync client. It never throws on bad input: whatever cannot be converted comes back as `undefined`, so a caller can fall back to the spine item alone or to a percentage.

```bash
npm install @prose-reader/koreader
```

## Usage

```typescript
import { cfiToXPointer, xPointerToCfi } from "@prose-reader/koreader"

// The pointer names its own spine item (DocFragment[N] is spine item N - 1):
// hand out that item's document, parsed as XHTML the way prose renders it.
const getSpineItem = (spineItemIndex: number) => {
  const item = reader.spineItemsManager.get(spineItemIndex)
  const frame = item?.renderer.getDocumentFrame()
  const document = frame instanceof HTMLIFrameElement ? frame.contentDocument : undefined

  return document ? { document, id: item?.item.id } : undefined
}

// A position pulled from a kosync server, into a prose CFI
const cfi = xPointerToCfi("/body/DocFragment[14]/body/div/p[3]/text().42", getSpineItem)
// => "epubcfi(/6/28[chap05]!/4/2/6/1:42)"

// prose's current position, into what the server and e-readers expect
const xpointer = cfiToXPointer(reader.pagination.state.beginCfi, getSpineItem)
// => "/body/DocFragment[14]/body/div/p[3]/text().42"
```

`getSpineItem` receives the index the pointer or CFI names and must answer with that item's document; passing whichever document is on screen is how other readers ended up a chapter away from the real position. The `id` is the `<itemref>` idref and becomes the CFI's id assertion, so the CFIs match the ones prose generates itself.

The lower layer is available when the CFI is not what you need:

```typescript
import {
  generateXPointer,
  parseXPointer,
  resolveXPointer,
  serializeXPointer,
} from "@prose-reader/koreader"

const parsed = parseXPointer("/body/DocFragment[14]/body/div/p[3]/text().42")
// { spineItemIndex: 13, steps: [...], point: 42, containsBoxingElements: false }

const position = resolveXPointer(parsed, spineItemDocument)
// { node: Text, offset: 42 } — a DOM boundary point, offset in UTF-16 units

const pointer = generateXPointer({ node: range.startContainer, offset: range.startOffset }, 13)
// "/body/DocFragment[14]/body/div/p[3]/text().42"

serializeXPointer(parsed) === "/body/DocFragment[14]/body/div/p[3]/text().42"
```

`parseXPointer` succeeds on any well-formed pointer even when the spine item cannot be loaded, which is enough to navigate to the right spine item: a resolution failure should fall back to `spineItemIndex`, never to a percentage first.

## API

| Function | What it does |
| --- | --- |
| `parseXPointer(input)` | `ParsedXPointer` or `undefined`. Accepts every shape crengine has written (see below) and the bare `/body/DocFragment[N]` third parties write for the start of an item. |
| `serializeXPointer(parsed)` | The string back, in the classic shape, keeping the indexes the structure carries. |
| `resolveXPointer(pointer, document)` | The `DomPosition` a pointer names in a spine item document, or `undefined` when crengine would fail too. |
| `generateXPointer(position, spineItemIndex)` | The pointer crengine itself writes for a DOM position, or `undefined` for positions crengine has no node for. |
| `xPointerToCfi(pointer, getSpineItem)` | The CFI prose generates for that position, built with `@prose-reader/cfi`. |
| `cfiToXPointer(cfi, getSpineItem)` | The pointer of a CFI's start; a root CFI (`epubcfi(/6/28[chap05]!)`) becomes the start of the item. |

```typescript
type DomPosition = {
  node: Node
  /** Text node: UTF-16 offset into its data (0 when omitted). Element: index of the child the position precedes; omitted, the element itself. */
  offset?: number
}

type ParsedXPointer = {
  spineItemIndex: number // 0-based
  steps: XPointerStep[] // below the item's <body>
  point: number | undefined // `.N`: code point offset on a text node, child index on an element
  containsBoxingElements: boolean // V1 pointers naming crengine's internal wrappers, unresolvable
}
```

## The dialect

The rules below were read from crengine's source (`crengine/src/lvtinydom.cpp`, `lvxml.cpp`, `epubfmt.cpp`, `mathml.cpp`) and verified against a real KOReader build (v2026.07, crengine DOM 20240114).

A pointer walks crengine's single DOM for the whole book, `<body><DocFragment><body>…</body></DocFragment>…</body>`, one `DocFragment` per `<itemref>` in spine order (`linear="no"` items, SVG items and items crengine fails to parse included, since DOM version 20240114). Steps count siblings of the same kind, 1-based: `/p[3]` is the third `<p>` child, `/text()[2]` the second text node child, `/4` the fourth child of any kind. A trailing `.N` is a point: a character offset on a text node, a child index on an element; without it the pointer names the node, which is how links and TOC targets are written. The grammar is `ParseXPathStep`, the resolution `createXPointerV2`.

crengine has written three shapes:

- **V1** (books first opened with a DOM older than 20200223): not normalised, paths go through the wrapper elements crengine inserts for layout (`autoBoxing`, `floatBox`, `inlineBox`, `tabularBox`, `rubyBox`, `mathBox`). The parser accepts them and flags `containsBoxingElements`; resolution returns `undefined`, because the index of an element inside a wrapper is relative to the wrapper and dropping the step would silently pick another node.
- **Classic V2** (`toStringV2`, DOM 20200223 to 20260811, what every device runs today): wrappers skipped, `[N]` written only when more than one sibling shares the name, `text()` without index when the parent holds a single text node. Example: `/body/DocFragment[22]/body/div/div[1]/blockquote[3]/p[1]/span/text().0`. A book with a single spine item gets `/body/DocFragment/body/…`.
- **Explicit V2** (crengine bumped its DOM version to 20260812 in August 2026): the same structure with `[N]` on every element and text step, `body[1]` included, e.g. `/body[1]/DocFragment[22]/body[1]/div[1]/p[3]/text()[1].42`. Read from the code; no KOReader release carried it when this package was written.

This package **emits the classic V2 shape**, always with `DocFragment[N]`. crengine resolves it whatever the book's DOM version, and every third-party consumer was written against it, several with a regex or a `split('/')` that `body[1]` would break. `serializeXPointer(parseXPointer(s))` gives `s` back for every classic pointer; an explicit-shape pointer keeps its `[1]`s through `serializeXPointer`, and takes the classic shape by going through the DOM (`generateXPointer(resolveXPointer(s, document))`), since only the DOM knows which indexes are needed.

### What crengine does to text

crengine does not keep the XHTML text as the browser does, so `text()[N]` counts and `.N` offsets have to be computed on its version of it (`ldomElementWriter::onText`, `PreProcessXmlString`, `ldomNode::initNodeRendMethod`):

- Outside `pre`, `\r`, `\n` and `\t` become spaces and a run of spaces keeps its first one; a leading or trailing space stays. Offsets count that collapsed text, in **Unicode code points** (crengine strings are UTF-32; an emoji is one), where a DOM offset counts UTF-16 units. `&nbsp;` is not a space here.
- A whitespace-only text node that would be the first child of a block is never inserted. Once an element is closed, a block holding both block children and inline content gets each run of inline content wrapped in an `autoBoxing` of its own, minus the whitespace-only text nodes that open or close the run; an inline element holding block children loses the whitespace-only text nodes next to those blocks. Only the whitespace between two inline siblings survives, as a single space. Comments and processing instructions do not exist for crengine, so they neither count nor protect a whitespace node.
- Path steps look through those wrappers, but an element point (`div.3`) counts the element's real children, a wrapper being one of them: the package counts the same way, and a DOM boundary inside a wrapped run becomes the run's start. Inside `<ruby>` and `<math>`, crengine rebuilds the children with wrappers whose shape depends on rendering, so only `.0` is emitted there.
- Some elements take no text at all: `table`, `thead`, `tbody`, `tfoot`, `tr`, `colgroup`, `col`, `img`, `object`, `embed`, `audio`, `input`, … and, inside `<svg>`, everything but `text`, `tspan`, `textPath`, `title`, `desc`, `metadata` and `style`, where the text is kept verbatim.
- Inside `pre` (and `listing`, `xmp`, `plaintext`, `textarea`, `style`), whitespace is kept, `\r\n` and a lone `\r` become `\n`, tabs are expanded to 8-column stops counted from the start of the text node (a newline counting as the first column of its line), and the newline right after a `<pre>` start tag is dropped.
- Inside `<math>`, text under token elements (`mi`, `mn`, `mo`, `mtext`, `ms`, `mspace`) is trimmed of surrounding blanks and dropped when empty; text under any other MathML element is dropped.
- Text longer than 8192 characters (`TEXT_SPLIT_SIZE`) is cut into several text nodes, each ending at the last space of a 8192-character window, so `text()[2]` can exist where the browser has one node. Both directions handle it.
- Tag names are lowercased, except inside `<svg>`; pointers compare names case-insensitively and by local name, so `<epub:switch>` is `switch`.

Which elements are blocks, take text or are preformatted comes from crengine's built-in element table (`fb2def.h`) and KOReader's default stylesheet (`data/epub.css` and the `html5.css` it imports): `[hidden]` elements are invisible, `button` and `input` are inline-blocks, `code` collapses whitespace. crengine takes these from the computed style, so a book stylesheet that changes `display` or `white-space` (a class rule, an inline style) is not seen by this package; that is the documented approximation, and the one place a pointer can land on a neighbouring text node.

### DocFragment and the spine

`DocFragment[N]` is spine item `N - 1`, by construction, for every book opened with crengine DOM 20240114 or later. Books first opened by KOReader before that got a fragment only for `application/xhtml+xml` items, so their saved pointers can be shifted by the number of non-XHTML items before them; nothing can be done about it here.

## Known limitations

- **Book CSS is not applied.** See above: a `<span style="display:block">` keeps its whitespace for this package where crengine drops it. The consequence is a pointer off by one text node, never off by a chapter.
- **V1 pointers** (with boxing elements) parse but do not resolve; fall back to the spine item.
- **Entities.** crengine decodes `&#32;` after its whitespace pass, so such spaces are not collapsed there; and it splits long text nodes on the source, where `&amp;` is five characters. Books with `&#32;` runs or entity-heavy paragraphs longer than 8192 characters can be off by a few characters.
- **CDATA sections** are text nodes to crengine and to this package, but `@prose-reader/cfi` does not know them, so `xPointerToCfi` produces no useful CFI for a position inside one.
- **Element points inside `<ruby>` and `<math>`**, and on table parts holding elements that do not belong there (a `<span>` directly in a `<table>`), are not emitted beyond `.0`: crengine's own wrappers there make the child count unknowable without its layout.
- **`<style>` and `<script>` in the body** are raw text to crengine's parser; nothing inside them is modelled.
- **SVG spine items** are addressed as a whole (`/body/DocFragment[N]/body`): crengine wraps the file in a body of its own and parses its XML declaration as an element, a structure the DOM cannot show, and KOReader shows such an item as one page anyway.
- **Explicit V2** (`body[1]`) was read from the code, not observed: confirm with a sidecar from a build carrying crengine DOM 20260812.

## Prior art

Every earlier implementation of this conversion shipped percentages or approximations first and rebuilt around exact pointers after bug reports:

- **KOReader / crengine** — the source of truth. Its sync plugin passes the remote string straight to `GotoXPointer` with no validation, so an emitted pointer must resolve on the first try.
- **Readest** (foliate-js, CFI native, the closest analogue) — emitted pointers KOReader could not read (readest/readest#1857), resolved pointers in whichever document was on screen and landed a chapter away (#5980), and let an unresolved pointer count as "no conflict" because the percentages happened to match (#5065). Its converter now pins its whitespace rules against crengine with a Lua oracle, the approach this package borrows and extends to the engine's own verdict on emitted pointers.
- **Kavita** — its `split('/')` gave up on pointers with fewer than six segments, such as `/body/DocFragment[28]/body/p[99].0` (Kareadita/Kavita#4932).
- **Crosspoint** — started with percentage plus an estimated path (crosspoint-reader#232) and rebuilt around exact visible-text offsets with code point counting and text node indexes (#3174); its parser expects digit-only indexes, tag names under 12 characters and at most 16 steps, constraints every pointer this package emits satisfies.
- **Komga, Calibre-Web Automated, Codexa** — percentage-only comparisons that report "already at the same position" a chapter behind. Percentages are computed per device from its own pagination and never agree; the pointer is the only precise field, which is why this package exists.

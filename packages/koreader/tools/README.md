# crengine ground truth

The fixtures under `src/tests/fixtures/` pair each EPUB with what KOReader's
engine (crengine) makes of it, so the test suite checks this package against
the real thing rather than against assumptions:

- `<fixture>.crengine.json` — for a sample of visible words of every spine
  item, crengine's own pointers to the word's start and end and the text
  between them (`xpointer-oracle.lua`). Consumed by `src/fixtures.test.ts`.
- `<fixture>.crengine-check.json` — crengine's verdict on pointers this
  package emits: whether each resolves, and the text it reads between a pair
  (`xpointer-check.lua`). Consumed by `src/crengineCheck.test.ts`.

The committed files were produced with the KOReader v2026.07 Linux x86_64
release (crengine DOM 20240114, `data/epub.css`, "web" block rendering), the
settings KOReader applies to a book it opens for the first time.

## Regenerating

Download a KOReader Linux release (`koreader-linux-x86_64-<version>.tar.xz`
from the KOReader GitHub releases), extract it, and copy KOReader's
`spec/unit` directory from the source tree of the same version into
`lib/koreader/` (the release ships without it; the scripts use its headless
harness). Then, from `lib/koreader/`:

```sh
export KO_HOME=/tmp/ko-oracle SDL_VIDEODRIVER=dummy LD_LIBRARY_PATH=$PWD/libs
cp <prose-reader>/packages/koreader/tools/*.lua .

# 1. crengine's pointers for the words of a fixture (every word; sample when committing)
./luajit xpointer-oracle.lua <fixtures>/synthetic.epub /tmp/synthetic.words.json 1

# 2. crengine's verdict on the pointers this package emits
XPOINTER_CHECK_EMIT_DIR=/tmp/pairs npx vitest run src/crengineCheck.test.ts   # in packages/koreader
./luajit xpointer-check.lua <fixtures>/synthetic.epub /tmp/pairs/synthetic.pairs.json <fixtures>/synthetic.crengine-check.json
```

`xpointer-oracle.lua` takes an optional DOM version as its fourth argument
(`20180528` reproduces the non-normalised V1 pointers of books first opened
before 2020, with their `autoBoxing` steps). The committed
`<fixture>.crengine.json` files are sampled to at most 120 words per spine
item; a full dump of a long book is several megabytes.

Adding a fixture: put the EPUB in the fixtures directory (`strip_epub.py
<in.epub> <out.epub>` keeps only its package, navigation and content
documents), add its name to the fixture lists in `src/fixtures.test.ts` and
`src/crengineCheck.test.ts`, and run both scripts.
`build_synthetic_fixture.py <out.epub>` regenerates `synthetic.epub`, the
EPUB 2 fixture built to exercise every crengine rule (block probes for every
HTML element, whitespace runs, entities, emoji, CJK, `pre`, tables, lists,
MathML, ruby, inline and standalone SVG, CRLF files, text nodes longer than
8192 characters).

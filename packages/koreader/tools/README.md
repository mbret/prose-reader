# KOReader ground truth

The fixtures under `src/tests/fixtures/` hold what KOReader itself makes of
each EPUB, so the test suite checks this package against the real thing rather
than against assumptions:

- `<fixture>.crengine.json` — for a sample of visible words of every spine
  item, crengine's own pointers to the word's start and end and the text
  between them (`xpointer-oracle.lua`). Consumed by `src/fixtures.test.ts`.
- `<fixture>.crengine-check.json` — crengine's verdict on pointers this
  package emits: whether each resolves, and the text it reads between a pair
  (`xpointer-check.lua`). Consumed by `src/crengineCheck.test.ts`.
- `koreader-digests.json`: KOReader's `util.partialMD5` of every fixture EPUB
  and of generated files of every edge size, and its sync plugin's digest of
  file names (`document-digest.lua`). Consumed by `src/digest.test.ts`.

The crengine files were produced with the KOReader v2026.07 Linux x86_64
release (crengine DOM 20240114, `data/epub.css`, "web" block rendering), the
settings KOReader applies to a book it opens for the first time. The digests
were produced with the v2026.07.1 Linux arm64 release.

## Regenerating

Download a KOReader Linux release (`koreader-linux-x86_64-<version>.tar.xz`
from the KOReader GitHub releases), extract it, and copy KOReader's
`spec/unit` directory from the source tree of the same version into
`lib/koreader/` (the release ships without it; the scripts use its headless
harness). Then, from `lib/koreader/`:

```sh
export KO_HOME=/tmp/ko-oracle SDL_VIDEODRIVER=dummy LD_LIBRARY_PATH=$PWD/libs
cp <prose-reader>/packages/koreader/tools/*.lua .

# 1. crengine's pointers for the words of a fixture, at most 120 per spine item
./luajit xpointer-oracle.lua <fixtures>/synthetic.epub <fixtures>/synthetic.crengine.json 120

# 2. crengine's verdict on the pointers this package emits: the test suite
#    writes the pairs from the repository, then crengine checks them from here
(cd <prose-reader>/packages/koreader && XPOINTER_CHECK_EMIT_DIR=/tmp/pairs pnpm exec vitest run src/crengineCheck.test.ts)
./luajit xpointer-check.lua <fixtures>/synthetic.epub /tmp/pairs/synthetic.pairs.json <fixtures>/synthetic.crengine-check.json
```

Both scripts write the files as the tests read them. `xpointer-oracle.lua`
takes the cap on words per spine item as its third argument (the words are
sampled evenly, `0` keeps them all; a full dump of a long book is several
megabytes) and an optional DOM version as its fourth (`20180528` reproduces
the non-normalised V1 pointers of books first opened before 2020, with
their `autoBoxing` steps).

The document digests need no `spec/unit`. The test suite writes the files and
the file names to hash, then KOReader hashes them from `lib/koreader/`:

```sh
export KO_HOME=/tmp/ko-digest LD_LIBRARY_PATH=$PWD/libs
cp <prose-reader>/packages/koreader/tools/document-digest.lua .

(cd <prose-reader>/packages/koreader && KOREADER_DIGEST_EMIT_DIR=/tmp/digest-inputs pnpm exec vitest run src/digest.test.ts)
./luajit document-digest.lua /tmp/digest-inputs <fixtures>/koreader-digests.json
```

The generated files run up to 4 GiB, with holes away from the offsets KOReader
samples, so they take little room on a file system that supports sparse files.

Adding a fixture: put the EPUB in the fixtures directory (`strip_epub.py
<in.epub> <out.epub>` keeps only its package, navigation and content
documents), add its name to `FIXTURES` in `src/tests/epub.ts`, and run the
three scripts.
`build_synthetic_fixture.py <out.epub>` regenerates `synthetic.epub`, the
EPUB 2 fixture built to exercise every crengine rule (block probes for every
HTML element, whitespace runs, entities, emoji, CJK, `pre`, tables, lists,
MathML, ruby, inline and standalone SVG, CRLF files, text nodes longer than
8192 characters).

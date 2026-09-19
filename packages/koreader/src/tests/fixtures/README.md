# Fixture books

Every EPUB here comes with two files produced by KOReader's own engine, as
`tools/README.md` describes: `<name>.crengine.json`, crengine's pointers for
a sample of every spine item's words, and `<name>.crengine-check.json`, its
verdict on the pointers this package emits for the book. The suites in
`src/fixtures.test.ts` and `src/crengineCheck.test.ts` read them.

The books other than the synthetic one are reduced by `tools/strip_epub.py`
to their package, navigation and content documents: images, fonts and media
are removed, since only the markup matters here.

| Fixture | Source | Rights |
| --- | --- | --- |
| `synthetic.epub` | Built by `tools/build_synthetic_fixture.py` to exercise every crengine rule the package models | MIT, part of this repository |
| `alice-pg11.epub` | Project Gutenberg #11, *Alice's Adventures in Wonderland*, https://www.gutenberg.org/ebooks/11 | Public domain in the USA |
| `frankenstein-pg84.epub` | Project Gutenberg #84, *Frankenstein*, https://www.gutenberg.org/ebooks/84 | Public domain in the USA |
| `cc-shared-culture.epub` | IDPF EPUB 3 samples, `cc-shared-culture`: *A Shared Culture* by Jesse Dylan for Creative Commons | CC BY-NC-SA, as its package metadata states |
| `accessible-epub-3.epub` | IDPF EPUB 3 samples, `accessible_epub_3`: *Accessible EPUB 3* by Matt Garrish, O'Reilly Media | CC BY-SA 3.0, the samples' default licence; the package metadata carries O'Reilly's 2012 copyright notice |
| `haruko.epub` | IDPF EPUB 3 samples, `haruko-html-jpeg` | CC BY-SA 3.0, the samples' default licence; no rights statement in the package |
| `mathematics.epub` | DAISY Consortium and DIAGRAM Center, *Advanced Accessibility Tests: Mathematics*, https://github.com/daisy/epub-accessibility-tests | No licence statement in the repository or the package |

The IDPF samples' licences come from https://idpf.github.io/epub3-samples/30/samples.html.

What each book brings: the synthetic one covers whitespace runs, entities,
emoji, CJK, `pre`, tables, lists, MathML, ruby, inline and standalone SVG,
CRLF files and text nodes longer than 8192 characters; the Gutenberg books
are EPUB 2 novels with NCX navigation; the Creative Commons sample has
`linear="no"` items; the O'Reilly book is an EPUB 3 with `pre` blocks and
nested sections; *Haruko* is vertical Japanese with ruby and image spine
items; the DAISY book carries MathML in real prose.

Replacing a book means regenerating its two files with a KOReader release,
per `tools/README.md`.

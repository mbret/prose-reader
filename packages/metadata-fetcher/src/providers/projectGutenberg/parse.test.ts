import { describe, expect, it } from "vitest"
import { parseProjectGutenbergRdf } from "./parse.ts"

const PROJECT_GUTENBERG_RDF_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xmlns:dcam="http://purl.org/dc/dcam/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:marcrel="http://id.loc.gov/vocabulary/relators/"
  xmlns:pgterms="http://www.gutenberg.org/2009/pgterms/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
>
  <pgterms:ebook rdf:about="ebooks/78139">
    <dcterms:publisher>Project Gutenberg</dcterms:publisher>
    <dcterms:issued>2026-03-08</dcterms:issued>
    <dcterms:rights>Public domain in the USA.</dcterms:rights>
    <dcterms:creator>
      <pgterms:agent><pgterms:name>Goethe, Johann Wolfgang von</pgterms:name></pgterms:agent>
    </dcterms:creator>
    <marcrel:trl>
      <pgterms:agent><pgterms:name>Carlyle, Thomas</pgterms:name></pgterms:agent>
    </marcrel:trl>
    <dcterms:title>Wilhelm Meister's apprenticeship and travels, vol. 2 (of 2)</dcterms:title>
    <dcterms:description>A catalog note</dcterms:description>
    <pgterms:marc520>A useful summary</pgterms:marc520>
    <dcterms:language><rdf:Description><rdf:value>en</rdf:value></rdf:Description></dcterms:language>
    <dcterms:subject>
      <rdf:Description>
        <dcam:memberOf rdf:resource="http://purl.org/dc/terms/LCSH"/>
        <rdf:value>Bildungsromans</rdf:value>
      </rdf:Description>
    </dcterms:subject>
    <dcterms:subject>
      <rdf:Description>
        <dcam:memberOf rdf:resource="http://purl.org/dc/terms/LCC"/>
        <rdf:value>PT</rdf:value>
      </rdf:Description>
    </dcterms:subject>
    <pgterms:bookshelf><rdf:Description><rdf:value>German Literature</rdf:value></rdf:Description></pgterms:bookshelf>
    <dcterms:hasFormat>
      <pgterms:file rdf:about="https://www.gutenberg.org/cache/epub/78139/pg78139.cover.small.jpg">
        <dcterms:format><rdf:Description><rdf:value>image/jpeg</rdf:value></rdf:Description></dcterms:format>
      </pgterms:file>
    </dcterms:hasFormat>
    <dcterms:hasFormat>
      <pgterms:file rdf:about="https://www.gutenberg.org/cache/epub/78139/pg78139.cover.medium.jpg">
        <dcterms:format><rdf:Description><rdf:value>image/jpeg</rdf:value></rdf:Description></dcterms:format>
      </pgterms:file>
    </dcterms:hasFormat>
  </pgterms:ebook>
</rdf:RDF>`

describe("parseProjectGutenbergRdf", () => {
  it("parses the metadata used by the resolver", () => {
    expect(parseProjectGutenbergRdf(PROJECT_GUTENBERG_RDF_FIXTURE)).toEqual({
      id: "78139",
      title: "Wilhelm Meister's apprenticeship and travels, vol. 2 (of 2)",
      publisher: "Project Gutenberg",
      issued: "2026-03-08",
      rights: "Public domain in the USA.",
      description: "A catalog note",
      summary: "A useful summary",
      languages: ["en"],
      subjects: ["Bildungsromans"],
      bookshelves: ["German Literature"],
      contributors: [
        { name: "Goethe, Johann Wolfgang von", role: "aut" },
        { name: "Carlyle, Thomas", role: "trl" },
      ],
      cover: {
        uri: "https://www.gutenberg.org/cache/epub/78139/pg78139.cover.medium.jpg",
        mediaType: "image/jpeg",
      },
    })
  })

  it("returns undefined for XML that is not a Gutenberg RDF record", () => {
    expect(
      parseProjectGutenbergRdf("<html><body>not RDF</body></html>"),
    ).toBeUndefined()
    expect(
      parseProjectGutenbergRdf("<rdf:RDF xmlns:rdf='rdf'/>"),
    ).toBeUndefined()
  })

  it("labels malformed XML", () => {
    expect(() => parseProjectGutenbergRdf("<rdf:RDF><x></rdf:RDF>")).toThrow(
      /Project Gutenberg RDF is malformed/,
    )
  })
})

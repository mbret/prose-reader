import { describe, expect, it } from "vitest"
import { generateXPointer } from "./generate"
import { resolveXPointer } from "./resolve"
import {
  childOf,
  documentWithBody,
  elementOf,
  firstElementChildOf,
  lastChildOf,
  parseSvgDocument,
  rangeText,
  textNodeOf,
} from "./tests/dom"

const prefix = "/body/DocFragment[1]/body"

/** Resolves `pointer` and generates it back; both must agree. */
const roundTrip = (document: Document, pointer: string) => {
  const position = resolveXPointer(pointer, document)

  expect(position, `resolve ${pointer}`).toBeDefined()

  if (!position) throw new Error("unresolved")

  expect(generateXPointer(position, 0), `regenerate ${pointer}`).toBe(pointer)

  return position
}

/** The character right after the resolved text position. */
const charAt = (position: { node: Node; offset?: number }) => {
  const data = position.node.textContent ?? ""
  const offset = position.offset ?? 0
  const codePoint = data.codePointAt(offset)

  return codePoint === undefined ? "" : String.fromCodePoint(codePoint)
}

describe("mixed inline content", () => {
  const document = documentWithBody("<p>Hello <em>x</em> world</p>")

  it("counts text() siblings around an inline element", () => {
    const first = roundTrip(document, `${prefix}/p/text()[1].0`)
    const second = roundTrip(document, `${prefix}/p/text()[2].1`)

    expect(charAt(first)).toBe("H")
    expect(charAt(second)).toBe("w")
    expect(rangeText(second, { node: second.node, offset: 6 })).toBe("world")
    expect(charAt(roundTrip(document, `${prefix}/p/em/text().0`))).toBe("x")
  })

  it("resolves text() without an index to the first text node, as crengine does", () => {
    const position = resolveXPointer(`${prefix}/p/text().4`, document)

    expect(position).toEqual({
      node: document.body.firstChild?.firstChild,
      offset: 4,
    })
  })
})

describe("whitespace-only text nodes crengine does not keep", () => {
  it("drops every one of them in a block that holds only block children", () => {
    const document = documentWithBody(
      '<div id="d">\n  <p>a</p>\n  <p>b</p>\n</div>',
    )
    const div = elementOf(document, "d")

    // parse: the leading "\n  " never inserted; render: the others removed
    expect(resolveXPointer(`${prefix}/div/text()`, document)).toBeUndefined()
    expect(resolveXPointer(`${prefix}/div/p[2]/text().0`, document)).toEqual({
      node: div.childNodes[3]?.firstChild,
      offset: 0,
    })

    for (const index of [0, 2, 4]) {
      expect(
        generateXPointer({ node: childOf(div, index), offset: 0 }, 0),
      ).toBeUndefined()
    }
  })

  it("keeps the ones between two inline nodes of a mixed block, not the ones next to a block child", () => {
    const document = documentWithBody(
      '<div id="d"><p>a</p> <em>x</em> <em>y</em> <p>b</p></div>',
    )
    const div = elementOf(document, "d")

    // crengine children: p, autoBoxing(em, " ", em), p
    expect(resolveXPointer(`${prefix}/div/text().0`, document)).toEqual({
      node: div.childNodes[3],
      offset: 0,
    })
    expect(resolveXPointer(`${prefix}/div/text()[2]`, document)).toBeUndefined()
    expect(generateXPointer({ node: childOf(div, 3), offset: 0 }, 0)).toBe(
      `${prefix}/div/text().0`,
    )
    expect(
      generateXPointer({ node: childOf(div, 1), offset: 0 }, 0),
    ).toBeUndefined()
    expect(
      generateXPointer({ node: childOf(div, 5), offset: 0 }, 0),
    ).toBeUndefined()
    expect(generateXPointer({ node: childOf(div, 6) }, 0)).toBe(
      `${prefix}/div/p[2]`,
    )

    // element points count the autoBoxing around the run as one child
    expect(resolveXPointer(`${prefix}/div.1`, document)).toEqual({
      node: div,
      offset: 2,
    })
    expect(resolveXPointer(`${prefix}/div.2`, document)).toEqual({
      node: div,
      offset: 6,
    })
    expect(resolveXPointer(`${prefix}/div.3`, document)).toEqual({
      node: div,
      offset: 7,
    })
    expect(resolveXPointer(`${prefix}/div.4`, document)).toBeUndefined()
    expect(generateXPointer({ node: div, offset: 2 }, 0)).toBe(
      `${prefix}/div.1`,
    )
    expect(generateXPointer({ node: div, offset: 4 }, 0)).toBe(
      `${prefix}/div.1`,
    )
    expect(generateXPointer({ node: div, offset: 6 }, 0)).toBe(
      `${prefix}/div.2`,
    )
    expect(generateXPointer({ node: div, offset: 7 }, 0)).toBe(
      `${prefix}/div.3`,
    )
  })

  it("boxes every run of a preformatted mixed block without dropping anything", () => {
    const document = documentWithBody(
      '<pre id="d"><p>a</p>\n<em>x</em>\n<p>b</p></pre>',
    )
    const pre = elementOf(document, "d")

    // crengine children: p, autoBoxing("\n", em, "\n"), p
    expect(resolveXPointer(`${prefix}/pre/text()[2].0`, document)).toEqual({
      node: pre.childNodes[3],
      offset: 0,
    })
    expect(resolveXPointer(`${prefix}/pre.2`, document)).toEqual({
      node: pre,
      offset: 4,
    })
    expect(resolveXPointer(`${prefix}/pre.4`, document)).toBeUndefined()
  })

  it("keeps them in a block that holds only inline content", () => {
    const document = documentWithBody("<p>\n<em>delta</em>\nepsilon zeta\n</p>")

    // crengine: <p><em>delta</em> epsilon zeta </p>, " epsilon zeta " is the only text child
    const position = roundTrip(document, `${prefix}/p/text().1`)

    expect(rangeText(position, { node: position.node, offset: 8 })).toBe(
      "epsilon",
    )
  })

  it("keeps the leading whitespace of an inline element", () => {
    const document = documentWithBody("<p><span>\n<em>x</em> y</span></p>")
    const span = document.body.firstChild?.firstChild

    // span is inline: crengine keeps "\n" (as " "), so " y" is text()[2]
    expect(charAt(roundTrip(document, `${prefix}/p/span/text()[2].1`))).toBe(
      "y",
    )
    expect(resolveXPointer(`${prefix}/p/span/text()[1].0`, document)).toEqual({
      node: span?.firstChild,
      offset: 0,
    })
  })

  it("removes the ones next to a block child of an inline element", () => {
    const document = documentWithBody(
      '<span id="s"><em>x</em> <p>block</p> <em>y</em></span>',
    )
    const span = elementOf(document, "s")

    // crengine: em, p, em
    expect(resolveXPointer(`${prefix}/span/text()`, document)).toBeUndefined()
    expect(resolveXPointer(`${prefix}/span/em[2]/text().0`, document)).toEqual({
      node: span.childNodes[4]?.firstChild,
      offset: 0,
    })
    expect(
      generateXPointer({ node: childOf(span, 1), offset: 0 }, 0),
    ).toBeUndefined()

    // no inline element and only whitespace text: kept
    const quiet = documentWithBody('<span id="q"> <p>block</p> </span>')

    expect(resolveXPointer(`${prefix}/span/text()[2]`, quiet)).toEqual({
      node: elementOf(quiet, "q").childNodes[2],
      offset: 0,
    })
  })

  it("drops every leading whitespace text separated by comments", () => {
    const document = documentWithBody("<div>\n<!-- c -->\n<p>a</p></div>")
    const div = firstElementChildOf(document.body)

    expect(
      generateXPointer({ node: childOf(div, 0), offset: 0 }, 0),
    ).toBeUndefined()
    expect(
      generateXPointer({ node: childOf(div, 2), offset: 0 }, 0),
    ).toBeUndefined()
    expect(resolveXPointer(`${prefix}/div/text()`, document)).toBeUndefined()
    expect(generateXPointer({ node: childOf(div, 3) }, 0)).toBe(
      `${prefix}/div/p`,
    )
  })

  it("keeps a leading text that contains a non-breaking space", () => {
    const document = documentWithBody("<div>\u00a0\n<p>a</p></div>")

    expect(charAt(roundTrip(document, `${prefix}/div/text().0`))).toBe("\u00a0")
  })

  it("does not drop the leading whitespace inside pre", () => {
    const document = documentWithBody("<pre>\n<span>x</span> y</pre>")

    // the stripped newline leaves an empty first text node
    expect(charAt(roundTrip(document, `${prefix}/pre/text()[2].1`))).toBe("y")
    expect(resolveXPointer(`${prefix}/pre/text()[1].0`, document)).toEqual({
      node: document.body.firstChild?.firstChild,
      offset: 1,
    })
    expect(
      resolveXPointer(`${prefix}/pre/text()[1].1`, document),
    ).toBeUndefined()
  })

  it("keeps whitespace between block children of a pre", () => {
    const document = documentWithBody("<pre><p>a</p>\n<p>b</p></pre>")

    expect(resolveXPointer(`${prefix}/pre/text().0`, document)).toEqual({
      node: document.body.firstChild?.childNodes[1],
      offset: 0,
    })
  })
})

describe("W1: offsets count crengine's collapsed text", () => {
  it("maps offsets after collapsed runs, CRLF and tabs", () => {
    const document = documentWithBody('<p id="p">placeholder</p>')
    const text = textNodeOf(document, "p")

    // set directly: an XML parser would normalise the CRLF away
    text.data = "lambda   mu\r\n\tnu"

    // crengine: "lambda mu nu"
    expect(resolveXPointer(`${prefix}/p/text().7`, document)).toEqual({
      node: text,
      offset: 9,
    })
    expect(resolveXPointer(`${prefix}/p/text().10`, document)).toEqual({
      node: text,
      offset: 14,
    })
    expect(resolveXPointer(`${prefix}/p/text().12`, document)).toEqual({
      node: text,
      offset: 16,
    })
    expect(resolveXPointer(`${prefix}/p/text().13`, document)).toBeUndefined()
    expect(generateXPointer({ node: text, offset: 9 }, 0)).toBe(
      `${prefix}/p/text().7`,
    )
    expect(generateXPointer({ node: text, offset: 8 }, 0)).toBe(
      `${prefix}/p/text().7`,
    )
    expect(generateXPointer({ node: text, offset: 16 }, 0)).toBe(
      `${prefix}/p/text().12`,
    )
    expect(generateXPointer({ node: text, offset: 17 }, 0)).toBeUndefined()
  })

  it("keeps runs of non-breaking spaces", () => {
    const document = documentWithBody('<p id="p">a\u00a0\u00a0\u00a0b</p>')

    expect(charAt(roundTrip(document, `${prefix}/p/text().4`))).toBe("b")
  })
})

describe("W3: pre keeps whitespace, strips one leading newline and expands tabs", () => {
  const document = documentWithBody(
    '<pre id="pre">\nline one\n\tTabbed\n  two spaces</pre>',
  )
  const text = textNodeOf(document, "pre")

  it("starts after the stripped newline", () => {
    expect(resolveXPointer(`${prefix}/pre/text().0`, document)).toEqual({
      node: text,
      offset: 1,
    })
    expect(generateXPointer({ node: text, offset: 0 }, 0)).toBe(
      `${prefix}/pre/text().0`,
    )
    expect(generateXPointer({ node: text, offset: 1 }, 0)).toBe(
      `${prefix}/pre/text().0`,
    )
  })

  it("expands a tab to the next 8-column stop, the newline counting as column 1", () => {
    // "line one\n" is 9 characters, the tab fills columns 2..8 with 7 spaces, "Tabbed" starts at 16
    expect(charAt(roundTrip(document, `${prefix}/pre/text().16`))).toBe("T")
    expect(resolveXPointer(`${prefix}/pre/text().12`, document)).toEqual({
      node: text,
      offset: 10,
    })
  })

  it("keeps runs of spaces", () => {
    expect(charAt(roundTrip(document, `${prefix}/pre/text().25`))).toBe("t")
  })

  it("applies pre mode to inline descendants of pre", () => {
    const nested = documentWithBody("<pre><span>a  b</span></pre>")

    expect(charAt(roundTrip(nested, `${prefix}/pre/span/text().3`))).toBe("b")
  })

  it("does not strip the leading newline of a pre whose first child is an element", () => {
    const nested = documentWithBody("<pre><code>\nfirst</code></pre>")

    expect(charAt(roundTrip(nested, `${prefix}/pre/code/text().1`))).toBe("f")
  })

  it("collapses whitespace in code outside pre, as KOReader's stylesheet does", () => {
    const document = documentWithBody(
      '<p><code id="c">zeta   eta</code> theta</p>',
    )

    expect(charAt(roundTrip(document, `${prefix}/p/code/text().5`))).toBe("e")
    expect(resolveXPointer(`${prefix}/p/code/text().8`, document)).toEqual({
      node: textNodeOf(document, "c"),
      offset: 10,
    })
  })
})

describe("W5: offsets are code points", () => {
  it("shifts a UTF-16 offset by one per emoji before it", () => {
    const document = documentWithBody('<p id="p">😀😀 target</p>')
    const text = textNodeOf(document, "p")

    expect(resolveXPointer(`${prefix}/p/text().3`, document)).toEqual({
      node: text,
      offset: 5,
    })
    expect(generateXPointer({ node: text, offset: 5 }, 0)).toBe(
      `${prefix}/p/text().3`,
    )
    expect(generateXPointer({ node: text, offset: 2 }, 0)).toBe(
      `${prefix}/p/text().1`,
    )
  })

  it("lands exactly on a surrogate pair", () => {
    const document = documentWithBody('<p id="p">ab😀c</p>')
    const text = textNodeOf(document, "p")

    expect(resolveXPointer(`${prefix}/p/text().2`, document)).toEqual({
      node: text,
      offset: 2,
    })
    expect(resolveXPointer(`${prefix}/p/text().3`, document)).toEqual({
      node: text,
      offset: 4,
    })
    expect(resolveXPointer(`${prefix}/p/text().4`, document)).toEqual({
      node: text,
      offset: 5,
    })
    expect(resolveXPointer(`${prefix}/p/text().5`, document)).toBeUndefined()
  })
})

describe("element points", () => {
  it("count crengine's children, after dropped whitespace", () => {
    const document = documentWithBody('<div id="d">\n<p>a</p> <p>b</p></div>')
    const div = elementOf(document, "d")

    // crengine children: p, p
    expect(resolveXPointer(`${prefix}/div.0`, document)).toEqual({
      node: div,
      offset: 1,
    })
    expect(resolveXPointer(`${prefix}/div.1`, document)).toEqual({
      node: div,
      offset: 3,
    })
    expect(resolveXPointer(`${prefix}/div.2`, document)).toEqual({
      node: div,
      offset: 4,
    })
    expect(resolveXPointer(`${prefix}/div.3`, document)).toBeUndefined()

    expect(generateXPointer({ node: div, offset: 0 }, 0)).toBe(
      `${prefix}/div.0`,
    )
    expect(generateXPointer({ node: div, offset: 1 }, 0)).toBe(
      `${prefix}/div.0`,
    )
    expect(generateXPointer({ node: div, offset: 2 }, 0)).toBe(
      `${prefix}/div.1`,
    )
    expect(generateXPointer({ node: div, offset: 3 }, 0)).toBe(
      `${prefix}/div.1`,
    )
    expect(generateXPointer({ node: div, offset: 4 }, 0)).toBe(
      `${prefix}/div.2`,
    )
    expect(generateXPointer({ node: div, offset: 5 }, 0)).toBeUndefined()
    expect(generateXPointer({ node: div }, 0)).toBe(`${prefix}/div`)

    const inline = documentWithBody('<p id="p">\n<em>a</em> <em>b</em></p>')
    const p = elementOf(inline, "p")

    // crengine children: em, " ", em
    expect(resolveXPointer(`${prefix}/p.1`, inline)).toEqual({
      node: p,
      offset: 2,
    })
    expect(resolveXPointer(`${prefix}/p.3`, inline)).toEqual({
      node: p,
      offset: 4,
    })
    expect(generateXPointer({ node: p, offset: 2 }, 0)).toBe(`${prefix}/p.1`)
  })

  it("resolve an element without a point to the element itself", () => {
    const document = documentWithBody('<h1 id="h">Title</h1>')

    expect(resolveXPointer(`${prefix}/h1`, document)).toEqual({
      node: elementOf(document, "h"),
    })
    expect(resolveXPointer(prefix, document)).toEqual({ node: document.body })
    expect(resolveXPointer(`${prefix}.0`, document)).toEqual({
      node: document.body,
      offset: 0,
    })
  })

  it("on an empty element accept only 0", () => {
    const document = documentWithBody(
      '<p>a<img id="i" src="x.png" alt=""/>b</p>',
    )
    const image = elementOf(document, "i")

    expect(resolveXPointer(`${prefix}/p/img.0`, document)).toEqual({
      node: image,
      offset: 0,
    })
    expect(resolveXPointer(`${prefix}/p/img.1`, document)).toBeUndefined()
    expect(generateXPointer({ node: image, offset: 0 }, 0)).toBe(
      `${prefix}/p/img.0`,
    )
  })
})

describe("empty elements and sibling counts", () => {
  const document = documentWithBody(
    '<p id="p">a<br/>b<img src="x" alt=""/>c<br/><br/>d</p><hr/><p id="q">e</p>',
  )

  it("count same-name siblings among elements only", () => {
    expect(charAt(roundTrip(document, `${prefix}/p[1]/text()[4].0`))).toBe("d")
    expect(charAt(roundTrip(document, `${prefix}/p[2]/text().0`))).toBe("e")
    expect(resolveXPointer(`${prefix}/p/br[3]`, document)).toEqual({
      node: elementOf(document, "p").childNodes[6],
    })
    expect(
      generateXPointer({ node: childOf(elementOf(document, "p"), 6) }, 0),
    ).toBe(`${prefix}/p[1]/br[3]`)
    expect(generateXPointer({ node: childOf(document.body, 1) }, 0)).toBe(
      `${prefix}/hr`,
    )
  })
})

describe("elements that take no text", () => {
  it("drops every text child of a table and its rows", () => {
    const document = documentWithBody(
      '<table id="t">\n  text in table\n  <tr id="r">\n    <td id="c">cell <em>two</em></td>\n  </tr>\n</table>',
    )

    expect(resolveXPointer(`${prefix}/table/text()`, document)).toBeUndefined()
    expect(
      resolveXPointer(`${prefix}/table/tr/text()`, document),
    ).toBeUndefined()
    expect(charAt(roundTrip(document, `${prefix}/table/tr/td/text().0`))).toBe(
      "c",
    )
    expect(resolveXPointer(`${prefix}/table.1`, document)).toEqual({
      node: elementOf(document, "t"),
      offset: 3,
    })
    expect(
      generateXPointer(
        { node: childOf(elementOf(document, "t"), 0), offset: 3 },
        0,
      ),
    ).toBeUndefined()
    expect(
      generateXPointer(
        { node: childOf(elementOf(document, "r"), 0), offset: 0 },
        0,
      ),
    ).toBeUndefined()
  })

  it("keeps text directly inside lists and sections", () => {
    const document = documentWithBody(
      '<ul id="u">\n  text in ul\n  <li>item</li>\n</ul><section id="s">\n  loose <p>a</p></section>',
    )

    // " text in ul " and " loose " once collapsed
    expect(charAt(roundTrip(document, `${prefix}/ul/text().1`))).toBe("t")
    expect(charAt(roundTrip(document, `${prefix}/section/text().1`))).toBe("l")
  })
})

describe("nesting", () => {
  it("resolves tables, nested lists and nested sections", () => {
    const document = documentWithBody(`
<section>
  <h2>One</h2>
  <section>
    <p>a</p>
    <p>b</p>
  </section>
  <section><p>c</p></section>
</section>
<ol><li>x<ul><li>y</li><li>z</li></ul></li></ol>
<table><tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td></tr></tbody></table>`)

    expect(
      charAt(roundTrip(document, `${prefix}/section/section[2]/p/text().0`)),
    ).toBe("c")
    expect(
      charAt(roundTrip(document, `${prefix}/section/section[1]/p[2]/text().0`)),
    ).toBe("b")
    expect(
      charAt(roundTrip(document, `${prefix}/ol/li/ul/li[2]/text().0`)),
    ).toBe("z")
    expect(
      charAt(roundTrip(document, `${prefix}/table/tbody/tr[2]/td/text().0`)),
    ).toBe("3")
    expect(
      charAt(roundTrip(document, `${prefix}/table/tbody/tr[1]/td[2]/text().0`)),
    ).toBe("2")
  })

  it("resolves inline svg text, keeping element name case inside svg", () => {
    const document = documentWithBody(
      '<div><svg xmlns="http://www.w3.org/2000/svg"><linearGradient id="g"/><text x="1">\n  Hello <tspan>world</tspan></text></svg></div>',
    )

    // inside svg: no whitespace collapsing, and <svg> itself takes no text
    expect(charAt(roundTrip(document, `${prefix}/div/svg/text/text().3`))).toBe(
      "H",
    )
    expect(
      charAt(roundTrip(document, `${prefix}/div/svg/text/tspan/text().0`)),
    ).toBe("w")
    expect(roundTrip(document, `${prefix}/div/svg/linearGradient`)).toEqual({
      node: elementOf(document, "g"),
    })
    expect(
      resolveXPointer(`${prefix}/div/svg/lineargradient`, document),
    ).toEqual({
      node: elementOf(document, "g"),
    })
  })

  it("addresses a standalone SVG spine item as a whole, never inside it", () => {
    const document = parseSvgDocument(
      '<svg xmlns="http://www.w3.org/2000/svg"><title>t</title><text id="x">Hello</text><g><text>grouped</text></g></svg>',
    )
    const text = elementOf(document, "x")

    expect(resolveXPointer(prefix, document)).toEqual({
      node: document.documentElement,
    })
    expect(resolveXPointer(`${prefix}.0`, document)).toEqual({
      node: document.documentElement,
    })
    expect(
      resolveXPointer(`${prefix}/svg/text/text().0`, document),
    ).toBeUndefined()
    expect(generateXPointer({ node: document.documentElement }, 0)).toBe(prefix)
    expect(generateXPointer({ node: document }, 0)).toBe(prefix)
    expect(generateXPointer({ node: text }, 0)).toBeUndefined()
    expect(
      generateXPointer({ node: childOf(text, 0), offset: 0 }, 0),
    ).toBeUndefined()
  })
})

describe("name matching", () => {
  it("matches pointer element names case-insensitively", () => {
    const document = documentWithBody('<div><p id="p">a</p></div>')

    expect(resolveXPointer(`${prefix}/DIV/P/text().0`, document)).toEqual({
      node: textNodeOf(document, "p"),
      offset: 0,
    })
  })

  it("writes uppercase source tags lowercase, as crengine's parser stores them", () => {
    const document = documentWithBody('<DIV><P id="p">a</P></DIV>')

    expect(
      generateXPointer({ node: textNodeOf(document, "p"), offset: 0 }, 0),
    ).toBe(`${prefix}/div/p/text().0`)
  })

  it("uses the local name of namespaced elements", () => {
    const document = documentWithBody(
      '<p><epub:switch><epub:default id="d">x</epub:default></epub:switch> after</p>',
    )

    expect(
      charAt(roundTrip(document, `${prefix}/p/switch/default/text().0`)),
    ).toBe("x")
  })

  it("accepts body[1] and DocFragment without an index", () => {
    const document = documentWithBody('<p id="p">a</p>')
    const expected = { node: textNodeOf(document, "p"), offset: 0 }

    expect(
      resolveXPointer(
        "/body[1]/DocFragment[1]/body[1]/p[1]/text()[1].0",
        document,
      ),
    ).toEqual(expected)
    expect(
      resolveXPointer("/body/DocFragment/body/p/text().0", document),
    ).toEqual(expected)
  })
})

describe("node index steps", () => {
  it("count every kept child", () => {
    const document = documentWithBody(
      '<div>\n<p>a</p><em>x</em> <em id="e">y</em> <p id="p">b</p></div>',
    )
    const div = firstElementChildOf(document.body)

    // crengine children of div: p, em, " ", em, p
    expect(resolveXPointer(`${prefix}/div/5/text().0`, document)).toEqual({
      node: textNodeOf(document, "p"),
      offset: 0,
    })
    expect(resolveXPointer(`${prefix}/div/3.0`, document)).toEqual({
      node: div.childNodes[3],
      offset: 0,
    })
    expect(resolveXPointer(`${prefix}/div/4/text().0`, document)).toEqual({
      node: textNodeOf(document, "e"),
      offset: 0,
    })
    expect(resolveXPointer(`${prefix}/div/6`, document)).toBeUndefined()
  })
})

describe("MathML", () => {
  it("trims token text and drops text under other MathML elements", () => {
    const document = documentWithBody(
      '<p><math xmlns="http://www.w3.org/1998/Math/MathML">\n<mrow>\n<mi>x</mi>\n<mo>\n  \u2212\n  <!-- minus -->\n</mo>\n<mtext> a b </mtext></mrow>\n</math> after</p>',
    )
    const mo = document.getElementsByTagName("mo")[0]
    const mtext = document.getElementsByTagName("mtext")[0]

    if (!mo || !mtext) throw new Error("no math")

    expect(
      resolveXPointer(`${prefix}/p/math/mrow/mo/text().0`, document),
    ).toEqual({
      node: mo.firstChild,
      offset: 3,
    })
    // the end of the trimmed text lands past the trimmed blanks, at the node end
    expect(
      resolveXPointer(`${prefix}/p/math/mrow/mo/text().1`, document),
    ).toEqual({
      node: mo.firstChild,
      offset: 7,
    })
    expect(
      resolveXPointer(`${prefix}/p/math/mrow/mo/text().2`, document),
    ).toBeUndefined()
    expect(
      resolveXPointer(`${prefix}/p/math/mrow/mo/text()[2]`, document),
    ).toBeUndefined()
    expect(generateXPointer({ node: childOf(mo, 0), offset: 3 }, 0)).toBe(
      `${prefix}/p/math/mrow/mo/text().0`,
    )
    expect(
      generateXPointer({ node: lastChildOf(mo), offset: 0 }, 0),
    ).toBeUndefined()
    expect(
      resolveXPointer(`${prefix}/p/math/mrow/text()`, document),
    ).toBeUndefined()
    // crengine wraps MathML children in boxes of its own: only the start of an element is a knowable point
    expect(generateXPointer({ node: mo, offset: 0 }, 0)).toBe(
      `${prefix}/p/math/mrow/mo.0`,
    )
    expect(generateXPointer({ node: mo, offset: 2 }, 0)).toBeUndefined()
    // " a b " collapses then trims to "a b"
    expect(
      charAt(roundTrip(document, `${prefix}/p/math/mrow/mtext/text().2`)),
    ).toBe("b")
    expect(charAt(roundTrip(document, `${prefix}/p/text().1`))).toBe("a")
  })
})

describe("elements KOReader's stylesheet hides", () => {
  it("treats [hidden] elements as invisible, so they neither hold nor break inline runs", () => {
    const document = documentWithBody(
      '<div id="d"><p>a</p> <span hidden="hidden">x</span> <em>y</em></div>',
    )
    const div = elementOf(document, "d")

    // run after the block child: " ", hidden span (a boundary), " ", em
    expect(resolveXPointer(`${prefix}/div/text()`, document)).toBeUndefined()
    expect(resolveXPointer(`${prefix}/div/em/text().0`, document)).toEqual({
      node: div.childNodes[4]?.firstChild,
      offset: 0,
    })
    expect(resolveXPointer(`${prefix}/div/span/text().0`, document)).toEqual({
      node: div.childNodes[2]?.firstChild,
      offset: 0,
    })
  })

  it("keeps whitespace as text under a [hidden] block, whose own children are untouched", () => {
    const document = documentWithBody(
      '<div id="d" hidden="hidden">\n<em>x</em> y</div>',
    )

    expect(charAt(roundTrip(document, `${prefix}/div/text()[2].1`))).toBe("y")
  })
})

describe("rejections", () => {
  const document = documentWithBody('<p id="p">abc</p><p>d</p>')

  it("returns undefined for unresolvable steps and points", () => {
    expect(resolveXPointer(`${prefix}/p[3]`, document)).toBeUndefined()
    expect(resolveXPointer(`${prefix}/span`, document)).toBeUndefined()
    expect(resolveXPointer(`${prefix}/p/text()[2]`, document)).toBeUndefined()
    expect(resolveXPointer(`${prefix}/p/text().4`, document)).toBeUndefined()
    expect(resolveXPointer(`${prefix}/p/text()/span`, document)).toBeUndefined()
    expect(resolveXPointer(`${prefix}/p.2`, document)).toBeUndefined()
    expect(
      resolveXPointer(
        "/body/DocFragment[12]/body/div/autoBoxing[1]/p[3]/text().42",
        document,
      ),
    ).toBeUndefined()
    expect(resolveXPointer("garbage", document)).toBeUndefined()
  })

  it("accepts the end of a text node and the end of the children", () => {
    expect(resolveXPointer(`${prefix}/p/text().3`, document)).toEqual({
      node: textNodeOf(document, "p"),
      offset: 3,
    })
    expect(resolveXPointer(`${prefix}/p.1`, document)).toEqual({
      node: elementOf(document, "p"),
      offset: 1,
    })
  })

  it("never resolves nodes outside the body", () => {
    const title = document.getElementsByTagName("title")[0]

    if (!title) throw new Error("no title element")

    expect(generateXPointer({ node: title }, 0)).toBeUndefined()
    expect(
      generateXPointer({ node: document.documentElement }, 0),
    ).toBeUndefined()
    expect(generateXPointer({ node: document.body }, 0)).toBe(prefix)
    expect(generateXPointer({ node: document.body, offset: 1 }, 0)).toBe(
      `${prefix}.1`,
    )
  })

  it("rejects detached nodes and bad spine indexes", () => {
    const detached = document.createElement("p")

    expect(generateXPointer({ node: detached }, 0)).toBeUndefined()
    expect(
      generateXPointer({ node: elementOf(document, "p") }, -1),
    ).toBeUndefined()
    expect(
      generateXPointer({ node: elementOf(document, "p") }, 1.5),
    ).toBeUndefined()
  })
})

describe("W4: text nodes longer than 8192 characters", () => {
  const word = "abcdefghi " // 10 characters, split after the space at 8189
  const long = word.repeat(1000)
  const document = documentWithBody(
    `<p id="p">${long}</p><p id="q">x${long}</p>`,
  )
  const text = textNodeOf(document, "p")

  it("exposes the pieces as consecutive text() siblings", () => {
    expect(resolveXPointer(`${prefix}/p[1]/text()[1].8189`, document)).toEqual({
      node: text,
      offset: 8189,
    })
    expect(resolveXPointer(`${prefix}/p[1]/text()[1].8190`, document)).toEqual({
      node: text,
      offset: 8190,
    })
    expect(
      resolveXPointer(`${prefix}/p[1]/text()[1].8191`, document),
    ).toBeUndefined()
    expect(resolveXPointer(`${prefix}/p[1]/text()[2].0`, document)).toEqual({
      node: text,
      offset: 8190,
    })
    expect(resolveXPointer(`${prefix}/p[1]/text()[2].1810`, document)).toEqual({
      node: text,
      offset: 10000,
    })
    expect(
      resolveXPointer(`${prefix}/p[1]/text()[3]`, document),
    ).toBeUndefined()
  })

  it("generates the piece a position falls in", () => {
    expect(generateXPointer({ node: text, offset: 0 }, 0)).toBe(
      `${prefix}/p[1]/text()[1].0`,
    )
    expect(generateXPointer({ node: text, offset: 8189 }, 0)).toBe(
      `${prefix}/p[1]/text()[1].8189`,
    )
    expect(generateXPointer({ node: text, offset: 8190 }, 0)).toBe(
      `${prefix}/p[1]/text()[2].0`,
    )
    expect(generateXPointer({ node: text, offset: 10000 }, 0)).toBe(
      `${prefix}/p[1]/text()[2].1810`,
    )
  })

  it("counts pieces as children for element points", () => {
    expect(resolveXPointer(`${prefix}/p[1].1`, document)).toEqual({
      node: text,
      offset: 8190,
    })
    expect(resolveXPointer(`${prefix}/p[1].2`, document)).toEqual({
      node: elementOf(document, "p"),
      offset: 1,
    })
    expect(
      generateXPointer({ node: elementOf(document, "p"), offset: 1 }, 0),
    ).toBe(`${prefix}/p[1].2`)
  })
})

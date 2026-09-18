/**
 * How crengine classifies elements while it loads a spine item, from its
 * built-in element table (crengine/include/fb2def.h) and the stylesheet
 * KOReader applies before any book CSS (data/html5.css, imported by
 * data/epub.css). These defaults decide what happens to text nodes in
 * `ldomElementWriter::onText` and `ldomNode::initNodeRendMethod`
 * (crengine/src/lvtinydom.cpp):
 *
 * - `display` — whether whitespace-only text children are dropped,
 * - `allow_text` — elements such as `<table>` or `<tr>` drop every text child,
 * - `white-space` — pre-like elements keep whitespace verbatim.
 *
 * Only these defaults are known here. crengine takes the values from the
 * computed style, so a book stylesheet that changes `display` or
 * `white-space` (class rules, inline styles) is not seen: this is the
 * package's documented approximation.
 */

/**
 * Elements whose default `display` is neither `inline` nor `none`: block,
 * list-item, table and table parts. `isBlockNode` in crengine treats all of
 * them alike (`display > css_d_inline && display != css_d_none`). Unknown
 * elements are inline.
 */
const BLOCK_ELEMENTS = new Set([
  "address",
  "annotation",
  "applet",
  "article",
  "aside",
  "audio",
  "author",
  "autoboxing",
  "blockquote",
  "body",
  "book-name",
  "book-title",
  "canvas",
  "caption",
  "center",
  "city",
  "col",
  "colgroup",
  "coverpage",
  "custom-info",
  "date",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "docfragment",
  "document-info",
  "dt",
  "email",
  "empty-line",
  "epigraph",
  "fictionbook",
  "fieldset",
  "figcaption",
  "figure",
  "floatbox",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "history",
  "home-page",
  "hr",
  "html",
  "id",
  "iframe",
  "isbn",
  "keygen",
  "keywords",
  "lang",
  "legend",
  "li",
  "listing",
  "main",
  "map",
  "menu",
  "multicol",
  "nav",
  "nickname",
  "noframes",
  "noscript",
  "ol",
  "optgroup",
  "output",
  "p",
  "part",
  "plaintext",
  "poem",
  "pre",
  "program-used",
  "publish-info",
  "publisher",
  "search",
  "section",
  "select",
  "sequence",
  "source",
  "src-lang",
  "src-ocr",
  "src-title-info",
  "src-url",
  "stanza",
  "subtitle",
  "summary",
  "table",
  "tabularbox",
  "tbody",
  "td",
  "text-author",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "title-info",
  "tr",
  "track",
  "ul",
  "v",
  "version",
  "video",
  "xmp",
  "year",
])

/** `display: inline-block` in html5.css: a block for its own children, an inline item for its parent. */
const INLINE_BLOCK_ELEMENTS = new Set(["button", "input", "marquee"])

/** `display: none` (fb2def.h and html5.css): invisible, not counted as inline nor block by the parent. */
const INVISIBLE_ELEMENTS = new Set([
  "area",
  "base",
  "basefont",
  "bgsound",
  "binary",
  "clonenode",
  "datalist",
  "description",
  "genre",
  "head",
  "link",
  "meta",
  "noembed",
  "param",
  "pseudoelem",
  "script",
  "style",
  "stylesheet",
  "template",
  "title",
])

/** Elements defined with `allow_text = false` in fb2def.h: their text children are never inserted. */
const NO_TEXT_ELEMENTS = new Set([
  "annotation",
  "applet",
  "area",
  "audio",
  "author",
  "base",
  "basefont",
  "bgsound",
  "clonenode",
  "col",
  "colgroup",
  "coverpage",
  "description",
  "docfragment",
  "document-info",
  "embed",
  "empty-line",
  "epigraph",
  "fictionbook",
  "head",
  "html",
  "image",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "object",
  "param",
  "part",
  "poem",
  "pseudoelem",
  "publish-info",
  "source",
  "src-title-info",
  "stanza",
  "svg",
  "table",
  "tbody",
  "tfoot",
  "thead",
  "title-info",
  "tr",
  "track",
])

/** Elements whose default `white-space` is `pre` or `pre-wrap` (fb2def.h, html5.css). */
const PRE_ELEMENTS = new Set([
  "listing",
  "plaintext",
  "pre",
  "style",
  "textarea",
  "xmp",
])

/**
 * Inside `<svg>` crengine only keeps text under these elements, verbatim
 * (`ldomElementWriter` constructor, `_insideSVG`).
 */
const SVG_TEXT_ELEMENTS = new Set([
  "desc",
  "metadata",
  "style",
  "text",
  "textpath",
  "title",
  "tspan",
])

/**
 * MathML elements crengine knows (fb2def.h, `EL_MATHML_START`..`EL_MATHML_END`).
 * Inside `<math>`, `MathMLHelper::getMathMLAdjustedText` (crengine/src/mathml.cpp)
 * drops the text of every one of them except the token elements, whose text
 * it trims; text under any other element is trimmed too.
 */
const MATHML_ELEMENTS = new Set([
  "annotation-xml",
  "maction",
  "maligngroup",
  "malignmark",
  "math",
  "menclose",
  "merror",
  "mfenced",
  "mfrac",
  "mglyph",
  "mi",
  "mlabeledtr",
  "mlongdiv",
  "mmultiscripts",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mprescripts",
  "mroot",
  "mrow",
  "ms",
  "mscarries",
  "mscarry",
  "msgroup",
  "msline",
  "mspace",
  "msqrt",
  "msrow",
  "mstack",
  "mstyle",
  "msub",
  "msubsup",
  "msup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
  "none",
  "semantics",
])

/** `EL_MATHML_TOKEN_START`..`EL_MATHML_TOKEN_END`: the MathML elements that hold text. */
const MATHML_TOKEN_ELEMENTS = new Set([
  "mglyph",
  "mi",
  "mn",
  "mo",
  "mtext",
  "mspace",
  "ms",
])

/**
 * crengine's parser reads the content of these as one raw text node up to the
 * closing tag (`LVXMLParser::ReadText`, `m_in_html_style_tag` /
 * `m_in_html_script_tag`), so the elements an XML parser finds inside them
 * do not exist for it. Nothing is modelled inside them.
 */
const RAW_TEXT_ELEMENTS = new Set(["script", "style"])

/**
 * The children a table part may hold without crengine wrapping them in a
 * `tabularBox` (`initTableRendMethods`, "Generate missing child wrappers"):
 * any other element child makes the part's child count unknowable.
 */
const PROPER_TABLE_CHILDREN: Record<string, Set<string>> = {
  table: new Set([
    "caption",
    "col",
    "colgroup",
    "tbody",
    "tfoot",
    "thead",
    "tr",
  ]),
  tbody: new Set(["tr"]),
  tfoot: new Set(["tr"]),
  thead: new Set(["tr"]),
  tr: new Set(["td", "th"]),
}

/** Whether crengine had to complete this table part with wrappers of its own. */
export const hasImproperTableChildren = (element: Element) => {
  const proper = PROPER_TABLE_CHILDREN[element.localName.toLowerCase()]

  if (!proper) return false

  for (
    let child = element.firstElementChild;
    child;
    child = child.nextElementSibling
  ) {
    if (!proper.has(child.localName.toLowerCase())) return true
  }

  return false
}

/** `pre` and `textarea` lose a newline immediately following their start tag (`_stripLeadingNewlineChar`, DOM >= 20210904). */
const LEADING_NEWLINE_STRIPPING_ELEMENTS = new Set(["pre", "textarea"])

/**
 * What an element is to crengine's rendering pass: `block` and `inlineBlock`
 * contain blocks or a final line box, `inline` flows in its parent's text,
 * `none` is invisible, `ruby` is inline with its own layout.
 */
export type ElementDisplay =
  | "block"
  | "inlineBlock"
  | "inline"
  | "none"
  | "ruby"

export type ParentContext = {
  display: ElementDisplay
  /** Whitespace-only first text child dropped at parse time (`_isBlock`). */
  block: boolean
  /** Text children inserted at all (`_allowText`). */
  allowsText: boolean
  /** Text kept verbatim, tabs expanded (`TXTFLG_PRE`). */
  pre: boolean
  stripsLeadingNewline: boolean
  /** Inside `<math>`: text trimmed of surrounding blanks, dropped when nothing is left. */
  trimsText: boolean
  /** Ruby and MathML: crengine rebuilds the children with its own wrappers, so child indexes are not knowable. */
  restructured: boolean
  /** `<style>` / `<script>`: raw text for crengine, no children modelled. */
  opaque: boolean
  /** Descendant of `<svg>`: crengine keeps element names case-sensitive there. */
  insideSvg: boolean
}

const ELEMENT_NODE = 1

export const isElement = (node: Node): node is Element =>
  node.nodeType === ELEMENT_NODE

/** The name crengine's XML parser stored: lowercased, except inside `<svg>` (`TXTFLG_CASE_SENSITIVE_TAGS_ATTRS`). */
export const crengineElementName = (element: Element, insideSvg: boolean) =>
  insideSvg ? element.localName : element.localName.toLowerCase()

/** Table parts keep their display under `[hidden]` (html5.css re-sets it, the table algorithm needs them). */
const TABLE_PART_ELEMENTS = new Set([
  "col",
  "colgroup",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
])

const getDisplayByName = (name: string): ElementDisplay => {
  if (INVISIBLE_ELEMENTS.has(name)) return "none"
  if (BLOCK_ELEMENTS.has(name)) return "block"
  if (INLINE_BLOCK_ELEMENTS.has(name)) return "inlineBlock"
  if (name === "ruby") return "ruby"

  return "inline"
}

/** The element's default display in KOReader, `[hidden]` included (html5.css). */
export const getElementDisplay = (element: Element): ElementDisplay => {
  const name = element.localName.toLowerCase()

  if (element.hasAttribute("hidden") && !TABLE_PART_ELEMENTS.has(name))
    return "none"

  return getDisplayByName(name)
}

export const getParentContext = (parent: Element): ParentContext => {
  const name = parent.localName.toLowerCase()
  let pre = false
  let insideSvg = false
  let insideMath = name === "math"

  for (
    let ancestor: Node | null = parent.parentNode;
    ancestor && isElement(ancestor);
    ancestor = ancestor.parentNode
  ) {
    const ancestorName = ancestor.localName.toLowerCase()

    if (PRE_ELEMENTS.has(ancestorName)) pre = true
    if (ancestorName === "svg") insideSvg = true
    if (ancestorName === "math") insideMath = true
  }

  if (insideSvg) {
    const allowsText = SVG_TEXT_ELEMENTS.has(name)

    return {
      display: "inline",
      block: false,
      allowsText,
      pre: pre || allowsText,
      stripsLeadingNewline: false,
      trimsText: false,
      restructured: false,
      opaque: RAW_TEXT_ELEMENTS.has(name),
      insideSvg: true,
    }
  }

  if (insideMath) {
    return {
      display: "inline",
      block: false,
      allowsText: MATHML_TOKEN_ELEMENTS.has(name) || !MATHML_ELEMENTS.has(name),
      pre,
      stripsLeadingNewline: false,
      trimsText: true,
      restructured: true,
      opaque: false,
      insideSvg: false,
    }
  }

  const display = getElementDisplay(parent)

  return {
    display,
    block: display === "block" || display === "inlineBlock",
    allowsText: !NO_TEXT_ELEMENTS.has(name),
    pre: pre || PRE_ELEMENTS.has(name),
    stripsLeadingNewline: LEADING_NEWLINE_STRIPPING_ELEMENTS.has(name),
    trimsText: false,
    restructured: display === "ruby",
    opaque: RAW_TEXT_ELEMENTS.has(name),
    insideSvg: name === "svg",
  }
}

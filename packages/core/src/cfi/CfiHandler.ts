const ELEMENT_NODE = Node.ELEMENT_NODE
const TEXT_NODE = Node.TEXT_NODE
const CDATA_SECTION_NODE = Node.CDATA_SECTION_NODE

function cfiEscape(str: string) {
  return str.replace(/[\[\]\^,();]/g, `^$&`)
}

// Get indices of all matches of regExp in str
// if `add` is non-null, add it to the matched indices
function matchAll(str: string, regExp: any, add: any) {
  add = add || 0
  const matches = []
  let offset = 0
  let m
  do {
    m = str.match(regExp)
    if (!m) break
    matches.push(m.index + add)
    // @ts-ignore
    offset += m.index + m.length
    // @ts-ignore
    str = str.slice(m.index + m.length)
  } while (offset < str.length)

  return matches
}

// Get the number in a that has the smallest diff to n
function closest(a: any[], n: number) {
  let minDiff
  let closest
  let i
  let diff
  for (i = 0; i < a.length; i++) {
    diff = Math.abs(a[i] - n)
    // @ts-ignore
    if (!i || diff < minDiff) {
      diff = minDiff
      closest = a[i]
    }
  }
  return closest
}

// Given a set of nodes that are all children
// and a reference to one of those nodes
// calculate the count/index of the node
// according to the CFI spec.
// Also re-calculate offset if supplied and relevant
function calcSiblingCount(
  nodes: globalThis.NodeListOf<globalThis.ChildNode>,
  n: number,
  offset: number,
) {
  let count = 0
  let lastWasElement
  let prevOffset = 0
  let firstNode = true
  let i
  let node
  for (i = 0; i < nodes.length; i++) {
    node = nodes[i]
    // @ts-ignore
    if (node.nodeType === ELEMENT_NODE) {
      if (lastWasElement || firstNode) {
        count += 2
        firstNode = false
      } else {
        count++
      }

      // @ts-ignore
      if (n === node) {
        // @ts-ignore
        if (node.tagName.toLowerCase() === `img`) {
          return { count, offset }
        }
        return { count }
      }
      prevOffset = 0
      lastWasElement = true
    } else if (
      node?.nodeType === TEXT_NODE ||
      node?.nodeType === CDATA_SECTION_NODE
    ) {
      if (lastWasElement || firstNode) {
        count++
        firstNode = false
      }

      // @ts-ignore
      if (n === node) {
        return { count, offset: offset + prevOffset }
      }

      // @ts-ignore
      prevOffset += node.textContent.length
      lastWasElement = false
    } else {
      // biome-ignore lint/correctness/noUnnecessaryContinue: <explanation>
      continue
    }
  }
  throw new Error(`The specified node was not found in the array of siblings`)
}

function compareTemporal(a: number, b: number) {
  const isA = typeof a === "number"
  const isB = typeof b === "number"

  if (!isA && !isB) return 0
  if (!isA && isB) return -1
  if (isA && !isB) return 1

  return (a || 0.0) - (b || 0.0)
}

function compareSpatial(a: any, b: any) {
  if (!a && !b) return 0
  if (!a && b) return -1
  if (a && !b) return 1

  const diff = (a.y || 0) - (b.y || 0)
  if (diff) return diff

  return (a.x || 0) - (b.x || 0)
}

export class CfiHandler {
  isRange = false
  parts: {}[]
  opts: {}
  cfi: string

  // Single static instances that will be reused
  private static tempDocument: Document | null = null
  private static tempTextArea: HTMLTextAreaElement | null = null
  private static getTextArea(): HTMLTextAreaElement {
    if (!CfiHandler.tempTextArea) {
      if (!CfiHandler.tempDocument) {
        CfiHandler.tempDocument = document.implementation.createHTMLDocument()
      }
      CfiHandler.tempTextArea =
        CfiHandler.tempDocument.createElement("textarea")
    }
    return CfiHandler.tempTextArea
  }

  constructor(str: string, opts: {}) {
    this.opts = Object.assign(
      {
        // If CFI is a Simple Range, pretend it isn't
        // by parsing only the start of the range
        flattenRange: false,
        // Strip temporal, spatial, offset and textLocationAssertion
        // from places where they don't make sense
        stricter: true,
      },
      opts || {},
    )

    this.cfi = str
    this.parts = []
    const isCFI = /^epubcfi\((.*)\)$/

    str = str.trim()
    const m = str.match(isCFI)
    if (!m) throw new Error(`Not a valid CFI`)
    if (m.length < 2) return // Empty CFI

    str = m[1] || ``

    let parsed
    let offset
    let newDoc
    let subParts = []
    let sawComma = 0
    while (str.length) {
      ({ parsed, offset, newDoc } = this.parse(str))
      if (!parsed || offset === null) throw new Error(`Parsing failed`)
      if (sawComma && newDoc)
        throw new Error(
          `CFI is a range that spans multiple documents. This is not allowed`,
        )

      subParts.push(parsed)

      // Handle end of string
      if (newDoc || str.length - offset <= 0) {
        // Handle end if this was a range
        if (sawComma === 2) {
          // @ts-ignore
          this.to = subParts
        } else {
          // not a range
          this.parts.push(subParts)
        }
        subParts = []
      }

      str = str.slice(offset)

      // Handle Simple Ranges
      if (str[0] === `,`) {
        if (sawComma === 0) {
          if (subParts.length) {
            this.parts.push(subParts)
          }
          subParts = []
        } else if (sawComma === 1) {
          if (subParts.length) {
            // @ts-ignore
            this.from = subParts
          }
          subParts = []
        }
        str = str.slice(1)
        sawComma++
      }
    }
    // @ts-ignore
    if (this.from && this.from.length) {
      // @ts-ignore
      if (this.opts.flattenRange || !this.to || !this.to.length) {
        // @ts-ignore
        this.parts = this.parts.concat(this.from)
        // @ts-ignore
        delete this.from
        // @ts-ignore
        delete this.to
      } else {
        this.isRange = true
      }
    }
    // @ts-ignore
    if (this.opts.stricter) {
      // @ts-ignore
      this.removeIllegalOpts()
    }
  }

  public destroy() {
    CfiHandler.tempTextArea = null
  }

  removeIllegalOpts(parts: any[]) {
    if (!parts) {
      // @ts-ignore
      if (this.from) {
        // @ts-ignore
        this.removeIllegalOpts(this.from)
        // @ts-ignore
        if (!this.to) return
        // @ts-ignore
        parts = this.to
      } else {
        parts = this.parts
      }
    }

    let i
    let j
    let part
    let subpart
    for (i = 0; i < parts.length; i++) {
      part = parts[i]
      for (j = 0; j < part.length - 1; j++) {
        subpart = part[j]
        delete subpart.temporal
        delete subpart.spatial
        delete subpart.offset
        delete subpart.textLocationAssertion
      }
    }
  }

  static generatePart(node: Element | Node, offset?: number, extra?: {}) {
    void extra
    let cfi = ``
    let o
    while (node.parentNode) {
      // @ts-ignore
      o = calcSiblingCount(node.parentNode.childNodes, node, offset)
      if (!cfi && o.offset) cfi = `:${o.offset}`

      cfi =
        // @ts-ignore
        `/` + o.count + (node.id ? `[` + cfiEscape(node.id) + `]` : ``) + cfi

      node = node.parentNode
    }

    return cfi
  }

  static generate(node: Node, offset?: number, extra?: {}) {
    let cfi

    if (Array.isArray(node)) {
      const strs = []
      for (const o of node) {
        strs.push(this.generatePart(o.node, o.offset, extra))
      }
      cfi = strs.join(`!`)
    } else {
      cfi = this.generatePart(node, offset, extra)
    }

    if (extra) cfi += extra

    return `epubcfi(${cfi})`
  }

  static toParsed(cfi: any) {
    if (typeof cfi === "string") {
      // cif = new this(cfi)
    }
    if (cfi.isRange) {
      return cfi.getFrom()
    }
    return cfi.get()
  }

  // Takes two CFI paths and compares them
  static comparePath(a: any[], b: any[]) {
    const max = Math.max(a.length, b.length)

    let i
    let cA
    let cB
    let diff
    for (i = 0; i < max; i++) {
      cA = a[i]
      cB = b[i]
      if (!cA) return -1
      if (!cB) return 1

      diff = this.compareParts(cA, cB)
      if (diff) return diff
    }
    return 0
  }

  // Sort an array of CFI objects
  static sort(a: any) {
    // @ts-ignore
    a.sort((a, b) => {
      return this.compare(a, b)
    })
  }

  // Takes two CFI objects and compares them.
  static compare(a: any, b: any) {
    let oA = a.get()
    let oB = b.get()
    if (a.isRange || b.isRange) {
      if (a.isRange && b.isRange) {
        const diff = this.comparePath(oA.from, oB.from)
        if (diff) return diff
        return this.comparePath(oA.to, oB.to)
      }
      if (a.isRange) oA = oA.from
      if (b.isRange) oB = oB.from

      return this.comparePath(oA, oB)
    } else {
      // neither a nor b is a range
      return this.comparePath(oA, oB)
    }
  }

  // Takes two parsed path parts (assuming path is split on '!') and compares them.
  static compareParts(a: any, b: any) {
    const max = Math.max(a.length, b.length)

    let i
    let cA
    let cB
    let diff
    for (i = 0; i < max; i++) {
      cA = a[i]
      cB = b[i]
      if (!cA) return -1
      if (!cB) return 1

      diff = cA.nodeIndex - cB.nodeIndex
      if (diff) return diff

      // The paths must be equal if the "before the first node" syntax is used
      // and this must be the last subpart (assuming a valid CFI)
      if (cA.nodeIndex === 0) {
        return 0
      }

      // Don't bother comparing offsets, temporals or spatials
      // unless we're on the last element, since they're not
      // supposed to be on elements other than the last
      if (i < max - 1) continue

      // Only compare spatials or temporals for element nodes
      if (cA.nodeIndex % 2 === 0) {
        diff = compareTemporal(cA.temporal, cB.temporal)
        if (diff) return diff

        diff = compareSpatial(cA.spatial, cB.spatial)
        if (diff) return diff
      }

      diff = (cA.offset || 0) - (cB.offset || 0)
      if (diff) return diff
    }
    return 0
  }

  /**
   * Could be even faster by checking if there would be some potentially
   * problematic characters creating unwanted resources trigger.
   * @see https://github.com/fread-ink/epub-cfi-resolver/issues/25
   * @todo check if we really need to do this anyway.
   */
  decodeEntities(_: Document, str: string) {
    try {
      /**
       * Original version, has problem when parsing actual html.
       * @see https://github.com/fread-ink/epub-cfi-resolver/issues/25
       */
      // const el = dom.createElement(`textarea`)
      // el.innerHTML = str
      // return el.value || ``
      /**
       * Other altenative that could be faster.
       */
      const el = CfiHandler.getTextArea()
      el.innerHTML = str
      return el.value || ``

      /**
       * Alternative suggested by LLM which prevent
       * triggering the html, resources, etc as a side effect
       * of parsing the content.
       *
       * @see https://github.com/fread-ink/epub-cfi-resolver/issues/25
       */
      // const parser = new DOMParser()
      // const doc = parser.parseFromString(
      //   `<!DOCTYPE html><text>${str}</text>`,
      //   "text/html",
      // )
      // return doc.querySelector("text")?.textContent || str
    } catch (err) {
      // TODO fall back to simpler decode?
      // e.g. regex match for stuff like &#160; and &nbsp;
      return str
    }
  }

  // decode HTML/XML entities and compute length
  trueLength(dom: Document, str: string) {
    return this.decodeEntities(dom, str).length
  }

  getFrom() {
    if (!this.isRange)
      throw new Error(`Trying to get beginning of non-range CFI`)
    // @ts-ignore
    if (!this.from) {
      return this.deepClone(this.parts)
    }
    const parts = this.deepClone(this.parts)
    // @ts-ignore
    parts[parts.length - 1] = parts[parts.length - 1].concat(this.from)
    return parts
  }

  getTo() {
    if (!this.isRange) throw new Error(`Trying to get end of non-range CFI`)
    const parts = this.deepClone(this.parts)
    // @ts-ignore
    parts[parts.length - 1] = parts[parts.length - 1].concat(this.to)
    return parts
  }

  get() {
    if (this.isRange) {
      return {
        from: this.getFrom(),
        to: this.getTo(),
        isRange: true,
      }
    }
    return this.deepClone(this.parts)
  }

  parseSideBias(o: any, loc: any) {
    if (!loc) return
    const m = loc.trim().match(/^(.*);s=([ba])$/)
    if (!m || m.length < 3) {
      if (typeof o.textLocationAssertion === "object") {
        o.textLocationAssertion.post = loc
      } else {
        o.textLocationAssertion = loc
      }
      return
    }
    if (m[1]) {
      if (typeof o.textLocationAssertion === "object") {
        o.textLocationAssertion.post = m[1]
      } else {
        o.textLocationAssertion = m[1]
      }
    }

    if (m[2] === `a`) {
      o.sideBias = `after`
    } else {
      o.sideBias = `before`
    }
  }

  parseSpatialRange(range: any) {
    if (!range) return undefined
    const m = range.trim().match(/^([\d\.]+):([\d\.]+)$/)
    if (!m || m.length < 3) return undefined
    const o = {
      x: Number.parseInt(m[1]),
      y: Number.parseInt(m[2]),
    }
    if (typeof o.x !== "number" || typeof o.y !== "number") {
      return undefined
    }
    return o
  }

  parse(cfi: any) {
    const o = {}
    const isNumber = /[\d]/
    let f
    let state
    let prevState
    let cur
    let escape
    let seenColon = false
    let seenSlash = false
    let i
    for (i = 0; i <= cfi.length; i++) {
      if (i < cfi.length) {
        cur = cfi[i]
      } else {
        cur = ``
      }
      if (cur === `^` && !escape) {
        escape = true
        continue
      }

      if (state === `/`) {
        if (cur.match(isNumber)) {
          if (!f) {
            f = cur
          } else {
            f += cur
          }
          escape = false
          continue
        } else {
          if (f) {
            // @ts-ignore
            o.nodeIndex = parseInt(f)
            f = null
          }
          prevState = state
          state = null
        }
      }

      if (state === `:`) {
        if (cur.match(isNumber)) {
          if (!f) {
            f = cur
          } else {
            f += cur
          }
          escape = false
          continue
        } else {
          if (f) {
            // @ts-ignore
            o.offset = parseInt(f)
            f = null
          }
          prevState = state
          state = null
        }
      }

      if (state === `@`) {
        let done = false
        if (cur.match(isNumber) || cur === `.` || cur === `:`) {
          if (cur === `:`) {
            if (!seenColon) {
              seenColon = true
            } else {
              done = true
            }
          }
        } else {
          done = true
        }
        if (!done) {
          if (!f) {
            f = cur
          } else {
            f += cur
          }
          escape = false
          continue
        }
        prevState = state
        state = null
        // @ts-ignore
        if (f && seenColon) o.spatial = this.parseSpatialRange(f)
        f = null
      }

      if (state === `~`) {
        if (cur.match(isNumber) || cur === `.`) {
          if (!f) {
            f = cur
          } else {
            f += cur
          }
          escape = false
          continue
        } else {
          if (f) {
            // @ts-ignore
            o.temporal = parseFloat(f)
          }
          prevState = state
          state = null
          f = null
        }
      }

      if (!state) {
        if (cur === `!`) {
          i++
          state = cur
          break
        }

        if (cur === `,`) {
          break
        }

        if (cur === `/`) {
          if (seenSlash) {
            break
          }
          seenSlash = true
          prevState = state
          state = cur
          escape = false
          continue
        }

        if (cur === `:` || cur === `~` || cur === `@`) {
          // @ts-ignore
          if (this.opts.stricter) {
            // We've already had a temporal or spatial indicator
            // and offset does not make sense and the same time
            if (
              cur === `:` &&
              // @ts-ignore
              (typeof o.temporal !== "undefined" ||
                // @ts-ignore
                typeof o.spatial !== "undefined")
            ) {
              break
            }
            // We've already had an offset
            // and temporal or spatial do not make sense at the same time
            // @ts-ignore
            if (
              (cur === `~` || cur === `@`) &&
              // @ts-ignore
              typeof o.offset !== "undefined"
            ) {
              break
            }
          }
          prevState = state
          state = cur
          escape = false
          seenColon = false // only relevant for '@'
          continue
        }

        if (cur === `[` && !escape && prevState === `:`) {
          prevState = state
          state = `[`
          escape = false
          continue
        }

        if (cur === `[` && !escape && prevState === `/`) {
          prevState = state
          state = `nodeID`
          escape = false
          continue
        }
      }

      if (state === `[`) {
        if (cur === `]` && !escape) {
          prevState = state
          state = null
          this.parseSideBias(o, f)
          f = null
        } else if (cur === `,` && !escape) {
          // @ts-ignore
          o.textLocationAssertion = {}
          if (f) {
            // @ts-ignore
            o.textLocationAssertion.pre = f
          }
          f = null
        } else {
          if (!f) {
            f = cur
          } else {
            f += cur
          }
        }
        escape = false
        continue
      }

      if (state === `nodeID`) {
        if (cur === `]` && !escape) {
          prevState = state
          state = null
          // @ts-ignore
          o.nodeID = f
          f = null
        } else {
          if (!f) {
            f = cur
          } else {
            f += cur
          }
        }
        escape = false
        continue
      }

      escape = false
    }

    // @ts-ignore
    if (!o.nodeIndex && o.nodeIndex !== 0)
      throw new Error(`Missing child node index in CFI`)

    return { parsed: o, offset: i, newDoc: state === `!` }
  }

  // The CFI counts child nodes differently from the DOM
  // Retrieve the child of parentNode at the specified index
  // according to the CFI standard way of counting
  getChildNodeByCFIIndex(
    dom: Document,
    parentNode: Element,
    index: number,
    offset: number,
  ) {
    const children = parentNode.childNodes
    if (!children.length) return { node: parentNode, offset: 0 }

    // index is pointing to the virtual node before the first node
    // as defined in the CFI spec
    if (index <= 0) {
      return { node: children[0], relativeToNode: `before`, offset: 0 }
    }

    let cfiCount = 0
    let lastChild
    let i
    let child

    // console.log(children, children.length)
    for (i = 0; i < children.length; i++) {
      child = children[i]

      switch (child?.nodeType) {
        case ELEMENT_NODE:
          // If the previous node was also an element node
          // then we have to pretend there was a text node in between
          // the current and previous nodes (according to the CFI spec)
          // so we increment cfiCount by two
          if (cfiCount % 2 === 0) {
            cfiCount += 2
            if (cfiCount >= index) {
              // @ts-ignore
              if (child.tagName.toLowerCase() === `img` && offset) {
                return { node: child, offset }
              }
              return { node: child, offset: 0 }
            }
          } else {
            // Previous node was a text node
            cfiCount += 1
            if (cfiCount === index) {
              // @ts-ignore
              if (child.tagName.toLowerCase() === `img` && offset) {
                return { node: child, offset }
              }

              return { node: child, offset: 0 }

              // This happens when offset into the previous text node was greater
              // than the number of characters in that text node
              // So we return a position at the end of the previous text node
            } else if (cfiCount > index) {
              if (!lastChild) {
                return { node: parentNode, offset: 0 }
              }

              return {
                node: lastChild,
                // @ts-ignore
                offset: this.trueLength(dom, lastChild.textContent),
              }
            }
          }
          lastChild = child
          break
        case TEXT_NODE:
        case CDATA_SECTION_NODE:
          // If this is the first node or the previous node was an element node
          if (cfiCount === 0 || cfiCount % 2 === 0) {
            cfiCount += 1
          } else {
            // If previous node was a text node then they should be combined
            // so we count them as one, meaning we don't increment the count
          }

          if (cfiCount === index) {
            // Get the true length of the text content
            const trueLength = this.trueLength(dom, child.textContent || "")

            // If the offset is equal to or less than the length, return this node
            // This ensures we return the correct node even when targeting the last position
            if (offset <= trueLength) {
              return { node: child, offset }
            }

            // If offset is greater, subtract this node's length and continue
            offset -= trueLength
          }
          lastChild = child
          break
        default:
          continue
      }
    }

    // If we've reached the end and haven't returned,
    // and lastChild is a text node, return it with the offset
    // This ensures we return the correct node even when targeting the end position
    // offset or a potential invalid greater offset.
    if (
      lastChild &&
      (lastChild.nodeType === TEXT_NODE ||
        lastChild.nodeType === CDATA_SECTION_NODE)
    ) {
      const trueLength = this.trueLength(dom, lastChild.textContent || "")
      return { node: lastChild, offset: Math.min(offset, trueLength) }
    }

    // index is pointing to the virtual node after the last child
    // as defined in the CFI spec
    if (index > cfiCount) {
      const o = { relativeToNode: `after`, offset: 0 }
      if (!lastChild) {
        // @ts-ignore
        o.node = parentNode
      } else {
        // @ts-ignore
        o.node = lastChild
      }
      // @ts-ignore
      if (this.isTextNode(o.node)) {
        // @ts-ignore
        o.offset = this.trueLength(dom, o.node.textContent.length)
      }
      return o
    }
  }

  isTextNode(node: Element) {
    if (!node) return false
    if (node.nodeType === TEXT_NODE || node.nodeType === CDATA_SECTION_NODE) {
      return true
    }
    return false
  }

  // Use a Text Location Assertion to correct and offset
  correctOffset(dom: Document, node: Element, offset: number, assertion: any) {
    let curNode = node
    let matchStr: string | undefined

    if (typeof assertion === "string") {
      matchStr = this.decodeEntities(dom, assertion)
    } else {
      assertion.pre = this.decodeEntities(dom, assertion.pre)
      assertion.post = this.decodeEntities(dom, assertion.post)
      matchStr = `${assertion.pre}.${assertion.post}`
    }

    if (!this.isTextNode(node)) {
      return { node, offset: 0 }
    }

    // @ts-ignore
    while (this.isTextNode(curNode.previousSibling)) {
      // @ts-ignore
      curNode = curNode.previousSibling
    }

    const startNode = curNode
    let str
    const nodeLengths = []
    let txt = ``
    let i = 0
    while (this.isTextNode(curNode)) {
      // @ts-ignore
      str = this.decodeEntities(dom, curNode.textContent)
      nodeLengths[i] = str.length
      txt += str

      if (!curNode.nextSibling) break
      // @ts-ignore
      curNode = curNode.nextSibling
      i++
    }

    // Find all matches to the Text Location Assertion
    const matchOffset = assertion.pre ? assertion.pre.length : 0
    const m = matchAll(txt, new RegExp(matchStr), matchOffset)
    if (!m.length) return { node, offset }

    // Get the match that has the closest offset to the existing offset
    let newOffset = closest(m, offset)

    if (curNode === node && newOffset === offset) {
      return { node, offset }
    }

    i = 0
    curNode = startNode
    // @ts-ignore
    while (newOffset >= nodeLengths[i]) {
      // @ts-ignore
      newOffset -= nodeLengths[i]
      if (newOffset < 0) return { node, offset }

      const nodeOffsets = [] // added because original code has nodeOffsets undefined. @see https://github.com/fread-ink/epub-cfi-resolver/blob/master/index.js#L826

      if (!curNode.nextSibling || i + 1 >= nodeOffsets.length)
        return { node, offset }
      i++
      // @ts-ignore
      curNode = curNode.nextSibling
    }

    return { node: curNode, offset: newOffset }
  }

  resolveNode(
    index: number,
    subparts: { nodeIndex: number; nodeID?: string; offset?: number }[],
    dom: Document,
    opts: {},
  ) {
    opts = Object.assign({}, opts || {})
    if (!dom) throw new Error(`Missing DOM argument`)

    // Traverse backwards until a subpart with a valid ID is found
    // or the first subpart is reached
    let startNode
    if (index === 0) {
      startNode = dom.querySelector(`package`)
    }

    if (!startNode) {
      for (const n of dom.childNodes) {
        if (n.nodeType === ELEMENT_NODE) {
          // if (n.nodeType === Node.DOCUMENT_NODE) {
          startNode = n
          break
        }
      }
    }

    // custom
    startNode = dom

    if (!startNode) throw new Error(`Document incompatible with CFIs`)

    let node = startNode
    let startFrom = 0
    let i
    let subpart: (typeof subparts)[number] | undefined
    for (i = subparts.length - 1; i >= 0; i--) {
      subpart = subparts[i]

      if (
        // @ts-ignore
        !opts.ignoreIDs &&
        // @ts-ignore
        subpart.nodeID &&
        // @ts-ignore
        (node = dom.getElementById(subpart.nodeID))
      ) {
        startFrom = i + 1
        break
      }
    }

    // console.log(startNode, startFrom)

    if (!node) {
      node = startNode
    }

    let o = { node, offset: 0 }

    for (i = startFrom; i < subparts.length; i++) {
      subpart = subparts[i]

      if (subpart) {
        // console.log(o, dom, o.node, subpart.nodeIndex, subpart.offset)
        // @ts-ignore
        o = this.getChildNodeByCFIIndex(
          dom,
          // @ts-ignore
          o.node,
          subpart.nodeIndex,
          subpart.offset,
        )

        // @ts-ignore
        if (subpart.textLocationAssertion) {
          // console.log(subparts, subpart, o)
          // @ts-ignore
          o = this.correctOffset(
            dom,
            // @ts-ignore
            o.node,
            subpart.offset,
            // @ts-ignore
            subpart.textLocationAssertion,
          )
        }
      }
    }

    return o
  }

  // Each part of a CFI (as separated by '!')
  // references a separate HTML/XHTML/XML document.
  // This function takes an index specifying the part
  // of the CFI and the appropriate Document or XMLDocument
  // that is referenced by the specified part of the CFI
  // and returns the URI for the document referenced by
  // the next part of the CFI
  // If the opt `ignoreIDs` is true then IDs
  // will not be used while resolving
  resolveURI(index: number, dom: Document, opts: { ignoreIDs?: boolean }) {
    opts = opts || {}
    if (index < 0 || index > this.parts.length - 2) {
      throw new Error(`index is out of bounds`)
    }

    const subparts = this.parts[index]
    if (!subparts) throw new Error(`Missing CFI part for index: ${index}`)

    // @ts-ignore
    const o = this.resolveNode(index, subparts, dom, opts)
    let node = o.node

    // @ts-ignore
    const tagName = node.tagName.toLowerCase()
    if (
      tagName === `itemref` &&
      // @ts-ignore
      node.parentNode.tagName.toLowerCase() === `spine`
    ) {
      // @ts-ignore
      const idref = node.getAttribute(`idref`)
      if (!idref) throw new Error(`Referenced node had not 'idref' attribute`)
      // @ts-ignore
      node = dom.getElementById(idref)
      if (!node) throw new Error(`Specified node is missing from manifest`)
      // @ts-ignore
      const href = node.getAttribute(`href`)
      if (!href) throw new Error(`Manifest item is missing href attribute`)

      return href
    }

    if (tagName === `iframe` || tagName === `embed`) {
      // @ts-ignore
      const src = node.getAttribute(`src`)
      if (!src) throw new Error(`${tagName} element is missing 'src' attribute`)
      return src
    }

    if (tagName === "object") {
      // @ts-ignore
      const data = node.getAttribute(`data`)
      if (!data)
        throw new Error(`${tagName} element is missing 'data' attribute`)
      return data
    }

    if (tagName === `image` || tagName === `use`) {
      // @ts-ignore
      const href = node.getAttribute(`xlink:href`)
      if (!href)
        throw new Error(`${tagName} element is missing 'xlink:href' attribute`)
      return href
    }

    throw new Error(`No URI found`)
  }

  deepClone(o: any) {
    return JSON.parse(JSON.stringify(o))
  }

  resolveLocation(dom: Document, parts: {}[]) {
    const index = parts.length - 1
    const subparts = parts[index]
    if (!subparts) throw new Error(`Missing CFI part for index: ${index}`)

    // @ts-ignore
    const o = this.resolveNode(index, subparts, dom)

    // @ts-ignore
    const lastPart = this.deepClone(subparts[subparts.length - 1])

    delete lastPart.nodeIndex
    // @ts-ignore
    if (!lastPart.offset) delete o.offset

    return { ...lastPart, ...o }
  }

  // Takes the Document or XMLDocument for the final
  // document referenced by the CFI
  // and returns the node and offset into that node
  resolveLast(dom: Document, opts: {}): string | {} {
    opts = Object.assign(
      {
        range: false,
      },
      opts || {},
    )

    if (!this.isRange) {
      return this.resolveLocation(dom, this.parts)
    }

    // @ts-ignore
    if (opts.range) {
      const range = dom.createRange()
      const from = this.getFrom()
      if (from.relativeToNode === `before`) {
        // @ts-ignore
        range.setStartBefore(from.node, from.offset)
      } else if (from.relativeToNode === `after`) {
        // @ts-ignore
        range.setStartAfter(from.node, from.offset)
      } else {
        range.setStart(from.node, from.offset)
      }

      const to = this.getTo()
      if (to.relativeToNode === `before`) {
        // @ts-ignore
        range.setEndBefore(to.node, to.offset)
      } else if (to.relativeToNode === `after`) {
        // @ts-ignore
        range.setEndAfter(to.node, to.offset)
      } else {
        range.setEnd(to.node, to.offset)
      }

      return range
    }

    return {
      from: this.resolveLocation(dom, this.getFrom()),
      to: this.resolveLocation(dom, this.getTo()),
      isRange: true,
    }
  }

  resolve(
    doc: Document,
    opts: {},
  ): { node: Node; offset?: number } | { node?: undefined; offset?: number } {
    // @ts-ignore
    return this.resolveLast(doc, opts)
  }
}

import {
  getElementDisplay,
  getParentContext,
  isElement,
  type ParentContext,
} from "./elements"
import { isEmptySpace, splitTextPieces, type TextMode } from "./text"

const TEXT_NODE = 3
const CDATA_SECTION_NODE = 4

export const isTextNode = (node: Node): node is Text =>
  node.nodeType === TEXT_NODE || node.nodeType === CDATA_SECTION_NODE

/**
 * A child as crengine holds it: browser comments and processing instructions
 * do not exist, dropped text nodes do not exist, and a long text node is
 * several text nodes.
 */
export type CrengineChild =
  | { kind: "element"; node: Element; childIndex: number }
  | {
      kind: "text"
      node: Text
      childIndex: number
      start: number
      end: number
      pieceIndex: number
      pieceCount: number
      mode: TextMode
    }

/** How the parent's rendering pass sees a child (`detectChildTypes`, `isInlineNode`). */
type ChildRole = "block" | "inline" | "invisible" | "text"

type ParsedChild = {
  node: Element | Text
  childIndex: number
  role: ChildRole
  whitespace: boolean
  /** First child inserted by the parser (for `_stripLeadingNewlineChar`). */
  first: boolean
}

/** Children as the parser inserted them (`ldomElementWriter::onText`, crengine/src/lvtinydom.cpp). */
const parseChildren = (parent: Element, context: ParentContext) => {
  const children: ParsedChild[] = []
  let childIndex = 0

  if (context.opaque) return children

  for (
    let node = parent.firstChild;
    node;
    node = node.nextSibling, childIndex++
  ) {
    if (isElement(node)) {
      const display = context.insideSvg ? "inline" : getElementDisplay(node)
      const role: ChildRole =
        display === "block"
          ? "block"
          : display === "none"
            ? "invisible"
            : "inline"

      children.push({
        node,
        childIndex,
        role,
        whitespace: false,
        first: children.length === 0,
      })

      continue
    }

    if (!isTextNode(node) || !context.allowsText) continue

    const whitespace = isEmptySpace(node.data)

    // A whitespace-only text that would open a block is not inserted, and
    // MathML text with nothing left once trimmed is not either.
    if (
      whitespace &&
      ((context.block && !context.pre && children.length === 0) ||
        context.trimsText)
    )
      continue

    children.push({
      node,
      childIndex,
      role: "text",
      whitespace,
      first: children.length === 0,
    })
  }

  return children
}

const isRunItem = (child: ParsedChild) =>
  child.role === "inline" || child.role === "text"

const isWhitespaceText = (child: ParsedChild | undefined) =>
  child !== undefined && child.role === "text" && child.whitespace

/**
 * A child once the element is closed: a node, or an `autoBoxing` wrapper
 * crengine put around a run of inline content that sits among block children.
 */
type RenderedChild =
  | { kind: "node"; child: ParsedChild }
  | { kind: "box"; children: ParsedChild[] }

/**
 * What `ldomNode::initNodeRendMethod` (crengine/src/lvtinydom.cpp) does to
 * the children once the element is closed. A block holding both block
 * children and inline content gets every run of inline nodes wrapped in an
 * `autoBoxing`, and `autoboxChildren` first drops the whitespace-only text
 * nodes opening the run and the one closing it (a run made only of them
 * disappears) unless the block is preformatted. An inline element holding
 * block children loses the whitespace-only text nodes next to those blocks,
 * when it also holds inline elements or real text.
 */
const renderChildren = (
  children: ParsedChild[],
  context: ParentContext,
): RenderedChild[] => {
  const asNodes = (): RenderedChild[] =>
    children.map((child) => ({ kind: "node", child }))

  if (context.display === "block" || context.display === "inlineBlock") {
    const hasBlockItems = children.some((child) => child.role === "block")
    const hasInline = children.some(isRunItem)

    if (!hasBlockItems || !hasInline) return asNodes()

    const rendered: RenderedChild[] = []
    let index = 0

    while (index < children.length) {
      const child = children[index]

      if (!child) break

      if (!isRunItem(child)) {
        rendered.push({ kind: "node", child })
        index++

        continue
      }

      let end = index

      while (end < children.length && isRunItem(children[end] as ParsedChild))
        end++

      let run = children.slice(index, end)

      if (!context.pre) {
        let first = 0

        while (first < run.length && isWhitespaceText(run[first])) first++

        run = run.slice(first)

        if (run.length > 0 && isWhitespaceText(run[run.length - 1]))
          run = run.slice(0, -1)
      }

      if (run.length > 0) rendered.push({ kind: "box", children: run })

      index = end
    }

    return rendered
  }

  if (context.display === "inline" && !context.pre) {
    const hasBlockNodes = children.some((child) => child.role === "block")

    if (!hasBlockNodes) return asNodes()

    const hasInlineNodes = children.some((child) => child.role === "inline")
    const hasNonEmptyText = children.some(
      (child) => child.role === "text" && !child.whitespace,
    )

    if (!hasInlineNodes && !hasNonEmptyText) return asNodes()

    const removed = new Set<ParsedChild>()

    children.forEach((child, index) => {
      if (child.role !== "block") return

      const previous = children[index - 1]
      const next = children[index + 1]

      if (previous && isWhitespaceText(previous)) removed.add(previous)
      if (next && isWhitespaceText(next)) removed.add(next)
    })

    return children
      .filter((child) => !removed.has(child))
      .map((child) => ({ kind: "node", child }))
  }

  return asNodes()
}

const getRenderedChildren = (parent: Element, context: ParentContext) =>
  renderChildren(parseChildren(parent, context), context)

const visitParsedChild = (
  child: ParsedChild,
  context: ParentContext,
  visit: (child: CrengineChild) => boolean,
): boolean => {
  if (isElement(child.node)) {
    return visit({
      kind: "element",
      node: child.node,
      childIndex: child.childIndex,
    })
  }

  const pieces = splitTextPieces(child.node.data)

  for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
    const piece = pieces[pieceIndex]

    if (!piece) continue

    const keepGoing = visit({
      kind: "text",
      node: child.node,
      childIndex: child.childIndex,
      start: piece.start,
      end: piece.end,
      pieceIndex,
      pieceCount: pieces.length,
      mode: {
        pre: context.pre,
        stripsLeadingNewline:
          context.stripsLeadingNewline && child.first && pieceIndex === 0,
        trim: context.trimsText,
      },
    })

    if (!keepGoing) return false
  }

  return true
}

/**
 * Walks the nodes crengine kept, in order, stopping when `visit` returns
 * `false`: what its parser inserted, minus what its rendering pass removed,
 * with text longer than `TEXT_SPLIT_SIZE` split into pieces. `autoBoxing`
 * wrappers are walked through, as `getNodeByIndex` does for path steps.
 */
export const visitCrengineChildren = (
  parent: Element,
  visit: (child: CrengineChild) => boolean,
  context: ParentContext = getParentContext(parent),
) => {
  for (const entry of getRenderedChildren(parent, context)) {
    const children = entry.kind === "box" ? entry.children : [entry.child]

    for (const child of children) {
      if (!visitParsedChild(child, context, visit)) return
    }
  }
}

/** One child as an element point (`.N`) counts it, with the browser index of the last node it covers. */
export type CrengineBoxedChild = {
  child: CrengineChild
  lastChildIndex: number
}

/**
 * The children an element point (`.N`) counts: crengine checks the point
 * against the element's real child count, where an `autoBoxing` wrapper is
 * one child. Each entry holds the first node the wrapper holds, or the node
 * itself, and where the wrapper ends.
 */
export const getCrengineBoxedChildren = (
  parent: Element,
  context: ParentContext = getParentContext(parent),
): CrengineBoxedChild[] => {
  const children: CrengineBoxedChild[] = []

  for (const entry of getRenderedChildren(parent, context)) {
    if (entry.kind === "box") {
      const first = entry.children[0]
      const last = entry.children[entry.children.length - 1]

      if (first && last) {
        visitParsedChild(first, context, (child) => {
          children.push({ child, lastChildIndex: last.childIndex })

          return false
        })
      }

      continue
    }

    visitParsedChild(entry.child, context, (child) => {
      children.push({ child, lastChildIndex: child.childIndex })

      return true
    })
  }

  return children
}

export const getCrengineChildren = (parent: Element): CrengineChild[] => {
  const children: CrengineChild[] = []

  visitCrengineChildren(parent, (child) => {
    children.push(child)

    return true
  })

  return children
}

/**
 * The `<body>` crengine's fragment body corresponds to. An SVG spine item
 * has none: crengine wraps such a file in a body of its own, and how it
 * parses what follows (the XML declaration becomes an element there) is not
 * something a DOM can show, so the item is handled as a whole.
 */
export const getFragmentBody = (document: Document): Element | undefined =>
  document.body ?? undefined

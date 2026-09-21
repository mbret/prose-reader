/**
 * One step of a crengine XPointer path, below the spine item's `<body>`.
 *
 * `index` is the 1-based position among siblings of the same kind, exactly as
 * written in the pointer: `undefined` when the pointer omitted `[N]`, which
 * crengine resolves as the first match (`getNodeByIndex` in
 * crengine/src/lvtinydom.cpp).
 */
export type XPointerStep =
  | { kind: "element"; name: string; index: number | undefined }
  | { kind: "text"; index: number | undefined }
  | { kind: "nodeIndex"; index: number }

export type ParsedXPointer = {
  /** 0-based spine index: `DocFragment[N]` is spine item `N - 1`. */
  spineItemIndex: number
  /** Steps below the fragment's `<body>`; empty when the pointer targets the body itself. */
  steps: XPointerStep[]
  /**
   * The trailing `.N` point, `undefined` when the pointer ends on a node.
   * On a text node it is a character offset counted in Unicode code points of
   * crengine's whitespace-normalised text, on an element it is a child index.
   */
  point: number | undefined
  /**
   * Books first opened with a crengine DOM older than 20200223 save pointers
   * naming crengine's internal wrapper elements (`autoBoxing`, `floatBox`…),
   * which do not exist in the source XHTML and cannot be resolved.
   */
  containsBoxingElements: boolean
}

/**
 * A DOM boundary point, shaped like `Range.startContainer` / `startOffset`.
 *
 * On a text node `offset` is a UTF-16 index into its data (0 when omitted).
 * On an element it is the index of the child the position precedes; when
 * omitted the position is the element itself.
 */
export type DomPosition = {
  node: Node
  offset?: number
}

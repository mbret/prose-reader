export type RuntimeHighlight = {
  anchorCfi: string | undefined
  focusCfi: string | undefined
  itemId: string
  color?: string
  contents?: string[]
  /**
   * Unique local ID. This is to ensure unicity
   * for duplicate selections
   */
  id: string
}

export type Highlight = RuntimeHighlight

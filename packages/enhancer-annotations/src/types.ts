export type SerializableHighlight = {
  anchorCfi: string | undefined
  focusCfi: string | undefined
  color?: string
  contents?: string[]
  /**
   * Not required, only used for display purposes
   */
  selectionAsText?: string
  /**
   * Unique local ID. This is to ensure unicity
   * for duplicate selections
   */
  id: string
}

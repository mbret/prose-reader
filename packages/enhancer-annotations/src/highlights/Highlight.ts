import { SerializableHighlight } from "../types"

export class Highlight {
  public anchorCfi: string | undefined
  public focusCfi: string | undefined
  public itemId: string
  public color?: string
  public contents?: string[]
  /**
   * Unique local ID. This is to ensure unicity
   * for duplicate selections
   */
  public id: string

  constructor(params: SerializableHighlight) {
    this.anchorCfi = params.anchorCfi
    this.focusCfi = params.focusCfi
    this.itemId = params.itemId
    this.color = params.color
    this.contents = params.contents
    this.id = params.id
  }

  toJSON(): SerializableHighlight {
    return {
      anchorCfi: this.anchorCfi,
      focusCfi: this.focusCfi,
      itemId: this.itemId,
      color: this.color,
      contents: this.contents,
      id: this.id,
    }
  }
}

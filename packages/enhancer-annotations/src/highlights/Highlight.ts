import { SerializableHighlight } from "../types"

export class Highlight {
  public anchorCfi: string | undefined
  public focusCfi: string | undefined
  public itemIndex?: number
  public color?: string
  public contents?: string[]
  public spineItemPageIndex?: number
  public absolutePageIndex?: number
  public range?: Range
  public lastSelectionText?: string
  /**
   * Unique local ID. This is to ensure unicity
   * for duplicate selections
   */
  public id: string

  constructor(params: SerializableHighlight & { itemIndex?: number }) {
    this.anchorCfi = params.anchorCfi
    this.focusCfi = params.focusCfi
    this.itemIndex = params.itemIndex
    this.color = params.color
    this.contents = params.contents
    this.id = params.id
    this.lastSelectionText = params.lastSelectionText
  }

  toJSON(): SerializableHighlight {
    return {
      anchorCfi: this.anchorCfi,
      focusCfi: this.focusCfi,
      color: this.color,
      contents: this.contents,
      id: this.id,
      lastSelectionText: this.lastSelectionText,
    }
  }
}

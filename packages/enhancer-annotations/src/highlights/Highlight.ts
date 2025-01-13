import type { Commands } from "../Commands"
import type { SerializableHighlight } from "../types"

export class Highlight {
  public cfi: string
  public endCfi: string | undefined
  public itemIndex?: number
  public color?: string
  public contents?: string[]
  public range?: Range
  public selectionAsText?: string
  /**
   * Unique local ID. This is to ensure unicity
   * for duplicate selections
   */
  public id: string

  constructor(params: SerializableHighlight & { itemIndex?: number }) {
    this.cfi = params.cfi
    this.endCfi = params.endCfi
    this.itemIndex = params.itemIndex
    this.color = params.color
    this.contents = params.contents
    this.id = params.id
    this.selectionAsText = params.selectionAsText
  }

  update(params: Parameters<Commands["update"]>[1]) {
    Object.assign(this, params)

    return this
  }

  toJSON(): SerializableHighlight {
    return {
      cfi: this.cfi,
      endCfi: this.endCfi,
      color: this.color,
      contents: this.contents,
      id: this.id,
      selectionAsText: this.selectionAsText,
    }
  }
}

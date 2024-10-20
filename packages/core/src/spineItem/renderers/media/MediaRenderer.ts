import { Renderer } from "../Renderer"

export class MediaRenderer extends Renderer {
  render(params: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }): { width: number; height: number } {
    throw new Error("Method not implemented.")
  }

  getWritingMode(): "vertical-rl" | "horizontal-tb" | undefined {
    throw new Error("Method not implemented.")
  }

  load(): void {
    throw new Error("Method not implemented.")
  }

  unload(): void {
    throw new Error("Method not implemented.")
  }

  getViewPortInformation():
    | {
        computedScale: number
        computedWidthScale: number
        viewportDimensions: { width: number; height: number }
      }
    | undefined {
    throw new Error("Method not implemented.")
  }

  destroy(): void {
    throw new Error("Method not implemented.")
  }

  get layers(): { element: Element }[] {
    return []
  }

  get writingMode() {
    return undefined
  }

  get readingDirection() {
    return undefined
  }
}

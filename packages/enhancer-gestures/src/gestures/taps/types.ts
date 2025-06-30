import type { SpineItem, UnsafeSpineItemPagePosition } from "@prose-reader/core"

export type TapAreaGestureContext = {
  page:
    | {
        spineItem: SpineItem
        spineItemPageIndex: number
        spineItemPagePosition: UnsafeSpineItemPagePosition
        pageSize: {
          width: number
          height: number
        }
      }
    | undefined
}

export type TapArea =
  /**
   * percentages
   */
  | {
      type: "margins"
      top?: number
      bottom?: number
      left?: number
      right?: number
    }
  | {
      type: "rectangle"
      x: number
      y: number
      width: number
      height: number
      unit?: "px" | "%"
    }
  | {
      type: "corner"
      corner: "top-left" | "top-right" | "bottom-left" | "bottom-right"
      size: number
      unit?: "px" | "%"
    }
  | { type: "center"; width: number; height: number; unit?: "px" | "%" }

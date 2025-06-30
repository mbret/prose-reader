import type { TapArea } from "./types"

export const isPositionInArea = (
  position: { x: number; y: number },
  area: TapArea,
  containerSize: { width: number; height: number },
): boolean => {
  const { x, y } = position
  const { width, height } = containerSize

  switch (area.type) {
    case "margins": {
      const { top, bottom, left, right } = area
      const inTop = top !== undefined ? y < height * top : true
      const inBottom = bottom !== undefined ? y > height * (1 - bottom) : true
      const inLeft = left !== undefined ? x < width * left : true
      const inRight = right !== undefined ? x > width * (1 - right) : true

      return (
        (top !== undefined && inTop) ||
        (bottom !== undefined && inBottom) ||
        (left !== undefined && inLeft) ||
        (right !== undefined && inRight)
      )
    }

    case "rectangle": {
      const {
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
        unit = "%",
      } = area
      const actualX = unit === "%" ? width * (rectX / 100) : rectX
      const actualY = unit === "%" ? height * (rectY / 100) : rectY
      const actualWidth = unit === "%" ? width * (rectWidth / 100) : rectWidth
      const actualHeight =
        unit === "%" ? height * (rectHeight / 100) : rectHeight

      return (
        x >= actualX &&
        x <= actualX + actualWidth &&
        y >= actualY &&
        y <= actualY + actualHeight
      )
    }

    case "corner": {
      const { corner, size, unit = "%" } = area
      const actualSize =
        unit === "%" ? Math.min(width, height) * (size / 100) : size

      switch (corner) {
        case "top-left":
          return x < actualSize && y < actualSize
        case "top-right":
          return x > width - actualSize && y < actualSize
        case "bottom-left":
          return x < actualSize && y > height - actualSize
        case "bottom-right":
          return x > width - actualSize && y > height - actualSize
        default:
          return false
      }
    }

    case "center": {
      const { width: centerWidth, height: centerHeight, unit = "%" } = area
      const actualWidth =
        unit === "%" ? width * (centerWidth / 100) : centerWidth
      const actualHeight =
        unit === "%" ? height * (centerHeight / 100) : centerHeight
      const centerX = width / 2
      const centerY = height / 2

      return (
        x >= centerX - actualWidth / 2 &&
        x <= centerX + actualWidth / 2 &&
        y >= centerY - actualHeight / 2 &&
        y <= centerY + actualHeight / 2
      )
    }

    default:
      return false
  }
}

export const calculatePageTurnLinearMargin = (screenWidth: number): number => {
  const minMargin = 0.15
  const maxMargin = 0.3
  const minWidth = 400
  const maxWidth = 1200

  if (screenWidth <= minWidth) return maxMargin
  if (screenWidth >= maxWidth) return minMargin

  // Linear interpolation between min and max
  const ratio = (screenWidth - minWidth) / (maxWidth - minWidth)
  return maxMargin - ratio * (maxMargin - minMargin)
}

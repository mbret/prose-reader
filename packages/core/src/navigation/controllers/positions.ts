import { SpinePosition } from "../../spine/types"

type SpinePositionLike = {
  x: number
  y: number
}

/**
 * LTR uses positive spine position and translate to negative translation.
 * Works both way for RTL.
 * @returns
 */
export const spinePositionToTranslation = (position: SpinePositionLike) => {
  return {
    x: -position.x,
    y: -position.y,
  }
}

export const translationToSpinePosition = (
  translation: { x: number; y: number } | DOMMatrix,
): SpinePosition => {
  if (translation instanceof DOMMatrix) {
    return new SpinePosition({
      x: -translation.e,
      y: -translation.f,
    })
  }

  return new SpinePosition({
    x: -translation.x,
    y: -translation.y,
  })
}

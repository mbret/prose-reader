import type { Reader } from "../../reader.ts"
import { UnboundSpinePosition } from "../../spine/types.ts"
import { getPositionRelativeToNonTransformedElement } from "../../utils/coordinates.ts"

export const getSpinePositionFromClientPosition = (
  position: { x: number; y: number },
  spineElement: HTMLElement,
) => {
  // Convert back to non-transformed coordinates
  return new UnboundSpinePosition(
    getPositionRelativeToNonTransformedElement(position, spineElement),
  )
}

export const createCoordinatesApi = (reader: Reader) => {
  return {
    getSpinePositionFromClientPosition: (position: {
      x: number
      y: number
    }) => {
      const { element } = reader.spine.value

      return element
        ? getSpinePositionFromClientPosition(position, element)
        : undefined
    },
  }
}

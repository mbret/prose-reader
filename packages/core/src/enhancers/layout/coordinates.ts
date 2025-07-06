import type { Reader } from "../../reader"
import { UnboundSpinePosition } from "../../spine/types"
import { getPositionRelativeToNonTransformedElement } from "../../utils/coordinates"

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
    getSpinePositionFromClientPosition: (position: { x: number; y: number }) =>
      reader.spine.element
        ? getSpinePositionFromClientPosition(position, reader.spine.element)
        : undefined,
  }
}

import { getNewScaledOffset } from "../../utils/layout"
import { ViewportPosition } from "./ViewportNavigator"

export const getScaledDownPosition = ({
  position: { x, y },
  spineElement,
  element,
}: {
  position: ViewportPosition
  spineElement: HTMLElement
  element: HTMLElement
}) => {
  if (!spineElement) throw new Error("Invalid spine element")

  const spineScaleX =
    spineElement.getBoundingClientRect().width / spineElement.offsetWidth

  /**
   * @important
   * we don't use pageSize but viewport clientWidth/height because on some browser (eg: firefox)
   * the scrollbar will take up content space, thus having a reduced pageSize. It will mess up calculation
   * otherwise
   */
  const scaledDownPosition = {
    x: getNewScaledOffset({
      newScale: 1,
      oldScale: spineScaleX,
      screenSize: element.clientWidth ?? 0,
      pageSize: spineElement.scrollWidth,
      scrollOffset: x,
    }),
    y: getNewScaledOffset({
      newScale: 1,
      oldScale: spineScaleX,
      screenSize: element.clientHeight ?? 0,
      pageSize: spineElement.scrollHeight,
      scrollOffset: y,
    }),
  }

  return scaledDownPosition
}

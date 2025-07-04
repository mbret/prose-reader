import { type Observable, switchMap, tap, timer } from "rxjs"
import type { Reader } from "../../reader"
import { noopElement } from "../../utils/dom"

/**
 * @important
 * Animation is not possible for scrolling mode because the animation
 * is based on transform origin and its impossible to have a correct
 * centered transform origin with the viewport in a scrollable container.
 * What we do is compute the "wanted" scroll position to make it look like
 * scale down/up appears centered.
 */
const ANIMATION_DURATION = 200

const adjustScrollToKeepContentCentered = (
  scrollContainer: HTMLElement,
  fromScale: number,
  toScale: number,
) => {
  const containerWidth = scrollContainer.clientWidth
  const containerHeight = scrollContainer.clientHeight

  // Current scroll position
  const currentScrollLeft = scrollContainer.scrollLeft
  const currentScrollTop = scrollContainer.scrollTop

  // Calculate what's currently in the center of the visible area
  const visibleCenterX = currentScrollLeft + containerWidth / 2
  const visibleCenterY = currentScrollTop + containerHeight / 2

  // After scaling, calculate where we need to scroll to keep the same content centered
  const scaleFactor = toScale / fromScale
  const newVisibleCenterX = visibleCenterX * scaleFactor
  const newVisibleCenterY = visibleCenterY * scaleFactor

  // Calculate new scroll position to keep the center content visible
  const newScrollLeft = newVisibleCenterX - containerWidth / 2
  const newScrollTop = newVisibleCenterY - containerHeight / 2

  return { newScrollLeft, newScrollTop }
}

export const createViewportModeHandler = (
  reader: Reader,
  viewportMode$: Observable<`normal` | `thumbnails`>,
) => {
  return viewportMode$.pipe(
    switchMap((viewportMode) => {
      const scrollContainer =
        reader.navigation.scrollNavigationController.value.element
      const viewportElement = reader.viewport.value.element
      const isScrollingMode =
        reader.settings.values.computedPageTurnMode === "scrollable"

      viewportElement.style.transition = `transform ${isScrollingMode ? 0 : ANIMATION_DURATION}ms`

      if (isScrollingMode) {
        viewportElement.style.transformOrigin = `top`
      } else {
        viewportElement.style.transformOrigin = `center`
      }

      const currentTransform = viewportElement.style.transform
      const currentScale = currentTransform.includes("scale")
        ? parseFloat(currentTransform.match(/scale\(([^)]+)\)/)?.[1] || "1")
        : 1

      const targetScale = viewportMode === "thumbnails" ? 0.5 : 1

      const { newScrollLeft, newScrollTop } = adjustScrollToKeepContentCentered(
        scrollContainer ?? noopElement(),
        currentScale,
        targetScale,
      )

      reader.viewport.value.element.style.transform = `scale(${targetScale})`

      scrollContainer?.scrollTo({
        left: Math.max(0, newScrollLeft),
        top: Math.max(0, newScrollTop),
        behavior: "instant",
      })

      return timer(isScrollingMode ? 0 : ANIMATION_DURATION).pipe(
        tap(() => {
          reader.layout()
        }),
      )
    }),
  )
}

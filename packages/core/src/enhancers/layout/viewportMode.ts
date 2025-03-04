import { type Observable, tap } from "rxjs"
import type { Reader } from "../../reader"

export const createViewportModeHandler = (
  reader: Reader,
  viewportMode$: Observable<`normal` | `thumbnails`>,
) => {
  return viewportMode$.pipe(
    tap((viewportMode) => {
      reader.viewport.value.element.style.transition = `transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)`

      if (viewportMode === `thumbnails`) {
        reader.viewport.value.element.style.transform = `scale(0.5)`
      } else {
        reader.viewport.value.element.style.transform = `scale(1)`
      }
      reader.layout()
    }),
  )
}

import { combineLatest, tap } from "rxjs"
import type { Reader } from "../../reader"
import { shouldEnableSpreadModeForViewport } from "./spreadMode"

export const updateSpreadMode = (reader: Reader) => {
  return combineLatest([
    reader.viewport.watch(["width", "height"]),
    reader.context.watch("manifest"),
  ]).pipe(
    tap(([viewport, manifest]) =>
      reader.settings.update({
        spreadMode: shouldEnableSpreadModeForViewport({
          manifest,
          viewport,
        }),
      }),
    ),
  )
}

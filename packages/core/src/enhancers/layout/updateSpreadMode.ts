import { combineLatest, tap } from "rxjs"
import type { Reader } from "../../reader"

export const updateSpreadMode = (reader: Reader) => {
  return combineLatest([
    reader.viewport.watch(["width", "height"]),
    reader.context.watch("manifest"),
  ]).pipe(
    tap(([{ width, height }, manifest]) => {
      const isLandscape = width > height

      if (!isLandscape && manifest?.renditionSpread === `portrait`) {
        return reader.settings.update({ spreadMode: true })
      }

      if (
        isLandscape &&
        (manifest?.renditionSpread === undefined ||
          manifest?.renditionSpread === `auto` ||
          manifest?.renditionSpread === `landscape` ||
          manifest?.renditionSpread === `both`)
      ) {
        return reader.settings.update({ spreadMode: true })
      }

      return reader.settings.update({ spreadMode: false })
    }),
  )
}

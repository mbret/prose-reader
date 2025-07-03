import { merge, switchMap, tap } from "rxjs"
import type { Reader } from "../../reader"

export const flagSpineItems = (reader: Reader) => {
  return reader.spineItemsManager.items$.pipe(
    switchMap((items) =>
      merge(
        ...items.map((item) =>
          item.pipe(
            tap((state) => {
              // biome-ignore lint/complexity/useLiteralKeys: TS needs it
              item.containerElement.dataset["isDirty"] = state.iDirty.toString()
              // biome-ignore lint/complexity/useLiteralKeys: TS needs it
              item.containerElement.dataset["isReady"] =
                state.isReady.toString()
            }),
          ),
        ),
      ),
    ),
  )
}

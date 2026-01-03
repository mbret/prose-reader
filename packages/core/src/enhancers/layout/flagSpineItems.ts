import { tap } from "rxjs"
import type { Reader } from "../../reader"

export const flagSpineItems = (reader: Reader) => {
  return reader.spineItemsObserver.states$.pipe(
    tap(({ item, isReady, isDirty }) => {
      // biome-ignore lint/complexity/useLiteralKeys: TS needs it
      item.containerElement.dataset["isDirty"] = isDirty.toString()
      // biome-ignore lint/complexity/useLiteralKeys: TS needs it
      item.containerElement.dataset["isReady"] = isReady.toString()
    }),
  )
}

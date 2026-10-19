import { fromEvent, merge, NEVER, share, switchMap, tap } from "rxjs"
import type { Reader } from "../../reader"

export const handleLinks = (reader: Reader) => {
  return merge(
    ...reader.spine.spineItemsManager.items.map((item) => {
      return item.loadedDocument$.pipe(
        switchMap((loadedDocument) => {
          if (!loadedDocument) return NEVER

          const anchorElements = Array.from(
            loadedDocument.querySelectorAll(`a`),
          )

          const events$ = anchorElements.map((element) =>
            fromEvent<MouseEvent>(element, `click`),
          )

          return merge(...events$)
        }),
      )
    }),
  ).pipe(
    tap((event) => {
      event.preventDefault()
    }),
    share(),
  )
}

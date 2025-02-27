import { NEVER, fromEvent, merge, share, switchMap, tap } from "rxjs"
import type { Reader } from "../../reader"

export const handleLinks = (reader: Reader) => {
  return reader.spine.spineItemsManager.items$.pipe(
    switchMap((items) =>
      merge(
        ...items.map((item) => {
          return item.loaded$.pipe(
            switchMap(() => {
              const frame = item.renderer.getDocumentFrame()

              if (!frame || !frame?.contentDocument) return NEVER

              const anchorElements = Array.from(
                frame.contentDocument.querySelectorAll(`a`),
              )

              const events$ = anchorElements.map((element) =>
                fromEvent<MouseEvent>(element, `click`),
              )

              return merge(...events$)
            }),
          )
        }),
      ),
    ),
    tap((event) => {
      event.preventDefault()
    }),
    share(),
  )
}

import { distinctUntilChanged, finalize, map, merge, of, switchMap } from "rxjs"
import type { SpineItem } from "../../spineItem/SpineItem"
import { FrameSelectionTracker } from "./FrameSelectionTracker"

/**
 * The selection in the item's loaded document, and `undefined` while there is
 * none: before it loads, and once it starts leaving.
 */
export const trackSpineItemSelection = (spineItem: SpineItem) =>
  spineItem.loadedDocument$.pipe(
    switchMap((loadedDocument) => {
      // The frame holding it, which the tracker watches being removed.
      const frame = spineItem.renderer.getDocumentFrame()

      if (!loadedDocument || !frame) return of(undefined)

      const selectionTracker = new FrameSelectionTracker(frame)

      return merge(
        selectionTracker.selectionChange$.pipe(
          map((selection) => {
            if (selection?.toString()) {
              return {
                type: "change" as const,
                selection,
              }
            }
            return undefined
          }),
        ),
        selectionTracker.selectionOver$.pipe(
          map(([event, selection]) => {
            return {
              type: "over" as const,
              event,
              selection,
            }
          }),
        ),
      ).pipe(
        finalize(() => {
          selectionTracker.destroy()
        }),
      )
    }),
    distinctUntilChanged(),
  )

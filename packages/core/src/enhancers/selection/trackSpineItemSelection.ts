import { distinctUntilChanged, finalize, map, merge, of, switchMap } from "rxjs"
import type { SpineItem } from "../../spineItem/SpineItem"
import { FrameSelectionTracker } from "./FrameSelectionTracker"

/**
 * The selection in the item's document while it is loaded, and `undefined`
 * while it is not: before it loads, and once it starts leaving.
 */
export const trackSpineItemSelection = (spineItem: SpineItem) =>
  spineItem.watch("loadStatus").pipe(
    switchMap(() => {
      const frame = spineItem.renderer.getDocumentFrame()

      if (!spineItem.loadedDocument || !frame) return of(undefined)

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

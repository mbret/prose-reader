import {
  distinctUntilChanged,
  endWith,
  filter,
  finalize,
  map,
  merge,
  NEVER,
  switchMap,
  takeUntil,
} from "rxjs"
import type { SpineItem } from "../../spineItem/SpineItem"
import { FrameSelectionTracker } from "./FrameSelectionTracker"

/**
 * The selection in the item's document, from its load until the document
 * leaves: `undefined` once it does.
 */
export const trackSpineItemSelection = (spineItem: SpineItem) =>
  spineItem.watch("loadStatus").pipe(
    filter((loadStatus) => loadStatus === "loaded"),
    switchMap(() => {
      const frame = spineItem.renderer.getDocumentFrame()
      const frameDoc = frame?.contentDocument || frame?.contentWindow?.document

      if (!frame || !frameDoc) return NEVER

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
        takeUntil(
          spineItem
            .watch("loadStatus")
            .pipe(filter((loadStatus) => loadStatus !== "loaded")),
        ),
        endWith(undefined),
        finalize(() => {
          selectionTracker.destroy()
        }),
      )
    }),
    distinctUntilChanged(),
  )

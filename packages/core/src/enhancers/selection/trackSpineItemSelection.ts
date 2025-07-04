import {
  distinctUntilChanged,
  endWith,
  finalize,
  map,
  merge,
  NEVER,
  switchMap,
  takeUntil,
} from "rxjs"
import type { SpineItem } from "../../spineItem/SpineItem"
import { FrameSelectionTracker } from "./FrameSelectionTracker"

export const trackSpineItemSelection = (spineItem: SpineItem) =>
  spineItem.watch("isLoaded").pipe(
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
        takeUntil(spineItem.unloaded$),
        endWith(undefined),
        finalize(() => {
          selectionTracker.destroy()
        }),
      )
    }),
    distinctUntilChanged(),
  )

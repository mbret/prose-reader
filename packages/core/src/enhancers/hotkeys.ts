import { EMPTY, fromEvent, map, merge, switchMap, takeUntil } from "rxjs"
import type { NavigationEnhancerOutput } from "./navigation/types"
import type { EnhancerOutput, RootEnhancer } from "./types/enhancer"

export const hotkeysEnhancer =
  <
    InheritOptions,
    InheritOutput extends EnhancerOutput<RootEnhancer> &
      NavigationEnhancerOutput,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    const navigateOnKey = (document: Document) =>
      fromEvent<KeyboardEvent>(document, "keyup").pipe(
        map((e) => {
          const { pageTurnDirection, computedPageTurnMode } =
            reader.settings.values

          if (computedPageTurnMode === "scrollable") {
            return e
          }

          if (pageTurnDirection === "horizontal") {
            if (e.key === `ArrowRight`) {
              return reader.navigation.turnRight()
            }

            if (e.key === `ArrowLeft`) {
              return reader.navigation.turnLeft()
            }
          }

          if (pageTurnDirection === "vertical") {
            if (e.key === `ArrowDown`) {
              return reader.navigation.turnRight()
            }

            if (e.key === `ArrowUp`) {
              return reader.navigation.turnLeft()
            }
          }

          return e
        }),
      )

    navigateOnKey(reader.context.document)
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    merge(
      ...reader.spineItemsManager.items.map((item) =>
        item.loadedDocument$.pipe(
          switchMap((loadedDocument) =>
            loadedDocument ? navigateOnKey(loadedDocument) : EMPTY,
          ),
        ),
      ),
    )
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return reader
  }

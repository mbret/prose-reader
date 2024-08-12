import { KeyboardEvent } from "react"
import {
  EMPTY,
  fromEvent,
  map,
  merge,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import { EnhancerOptions, EnhancerOutput, RootEnhancer } from "./types/enhancer"
import { NavigationEnhancerOutput } from "./navigation/types"

export const hotkeysEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer> &
      NavigationEnhancerOutput,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    const navigateOnKey = (document: Document) =>
      fromEvent<KeyboardEvent>(document, "keyup").pipe(
        withLatestFrom(reader.settings.values$),
        map(([e, { pageTurnDirection }]) => {
          if (pageTurnDirection === "horizontal") {
            if (e.key === `ArrowRight`) {
              reader.navigation.turnRight()
            }

            if (e.key === `ArrowLeft`) {
              reader.navigation.turnLeft()
            }
          }

          if (pageTurnDirection === "vertical") {
            if (e.key === `ArrowDown`) {
              reader.navigation.turnRight()
            }

            if (e.key === `ArrowUp`) {
              reader.navigation.turnLeft()
            }
          }

          return e
        }),
      )

    navigateOnKey(document).pipe(takeUntil(reader.$.destroy$)).subscribe()

    reader.spineItemsManager.items$
      .pipe(
        switchMap((spineItems) =>
          merge(
            ...spineItems.map((item) =>
              item.$.loaded$.pipe(
                switchMap((iframe) =>
                  iframe?.contentDocument
                    ? navigateOnKey(iframe.contentDocument)
                    : EMPTY,
                ),
              ),
            ),
          ),
        ),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    return reader
  }

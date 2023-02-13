import { KeyboardEvent } from "react"
import { EMPTY, fromEvent, map, merge, switchMap, takeUntil, withLatestFrom } from "rxjs"
import { EnhancerOptions, EnhancerOutput, RootEnhancer } from "./types/enhancer"

export const hotkeysEnhancer =
  <InheritOptions extends EnhancerOptions<RootEnhancer>, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    const navigateOnKey = (document: Document) =>
      fromEvent<KeyboardEvent>(document, "keyup").pipe(
        withLatestFrom(reader.settings$),
        map(([e, { pageTurnDirection }]) => {
          if (pageTurnDirection === "horizontal") {
            if (e.key === `ArrowRight`) {
              reader.turnRight()
            }

            if (e.key === `ArrowLeft`) {
              reader.turnLeft()
            }
          }

          if (pageTurnDirection === "vertical") {
            if (e.key === `ArrowDown`) {
              reader.turnRight()
            }

            if (e.key === `ArrowUp`) {
              reader.turnLeft()
            }
          }

          return e
        })
      )

    navigateOnKey(document).pipe(takeUntil(reader.$.destroy$)).subscribe()

    reader.spineItems$
      .pipe(
        switchMap((spineItems) =>
          merge(
            ...spineItems.map((item) =>
              item.$.loaded$.pipe(
                switchMap((iframe) => (iframe?.contentDocument ? navigateOnKey(iframe.contentDocument) : EMPTY))
              )
            )
          )
        ),
        takeUntil(reader.$.destroy$)
      )
      .subscribe()

    return reader
  }

import type { KeyboardEvent } from "react"
import { EMPTY, fromEvent, map, merge, switchMap, takeUntil } from "rxjs"
import { isHtmlTagElement } from "../utils/dom"
import type { NavigationEnhancerOutput } from "./navigation/types"
import type {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "./types/enhancer"

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
        item.watch("isLoaded").pipe(
          switchMap(() => {
            const element = item.renderer.getDocumentFrame()

            return isHtmlTagElement(element, "iframe") &&
              element.contentDocument
              ? navigateOnKey(element.contentDocument)
              : EMPTY
          }),
        ),
      ),
    )
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return reader
  }

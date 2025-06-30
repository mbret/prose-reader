import type { HookManager, Reader } from "@prose-reader/core"
import type { TapRecognizer } from "gesturx"
import {
  EMPTY,
  combineLatest,
  filter,
  first,
  map,
  of,
  switchMap,
  withLatestFrom,
} from "rxjs"
import type { GesturesSettingsManager } from "../../SettingsManager"
import type { GestureRecognizable, Hook } from "../../types"
import {
  getPositionRelativeToContainer,
  isNotLink,
  istMatchingSelectors,
} from "../../utils"
import { calculatePageTurnLinearMargin, isPositionInArea } from "./utils"

export const registerTaps = ({
  reader,
  recognizable,
  hookManager,
  settingsManager,
  recognizer,
}: {
  recognizable: GestureRecognizable
  reader: Reader
  hookManager: HookManager<Hook>
  recognizer: TapRecognizer
  settingsManager: GesturesSettingsManager
}) => {
  const gestures$ = recognizable.events$.pipe(
    filter((event) => event.recognizer === recognizer),
    withLatestFrom(reader.context.watch(`rootElement`), reader.spine.element$),
    switchMap(([{ event }, containerElement, spineElement]) => {
      if (!containerElement || !spineElement) return EMPTY

      const normalizedEvent = event.event
      const { computedPageTurnDirection } = reader.settings.values

      if (
        event.type === "tap" &&
        isNotLink(event) &&
        !istMatchingSelectors(settingsManager.values.ignore, event)
      ) {
        if (`x` in normalizedEvent) {
          const containerElementRect = containerElement.getBoundingClientRect()
          const width = containerElementRect.width
          const pageTurnMargin = calculatePageTurnLinearMargin(width)
          const positionInContainer = getPositionRelativeToContainer(
            normalizedEvent,
            containerElementRect,
          )

          const positionInSpineNonTransformed =
            reader.coordinates.getSpinePositionFromClientPosition(
              normalizedEvent,
            )

          const spineItemPageInfo = positionInSpineNonTransformed
            ? reader.spine.locator.getSpineItemPageInfoFromSpinePosition(
                positionInSpineNonTransformed,
              )
            : undefined

          const beforeTapResults$ = hookManager.execute(
            "beforeTapGesture",
            undefined,
            { event$: of({ event, page: spineItemPageInfo }) },
          )

          return combineLatest([...beforeTapResults$, of(true)]).pipe(
            first(),
            filter((results) => !results.some((result) => result === false)),
            map(() => {
              if (
                computedPageTurnDirection === "horizontal" &&
                isPositionInArea(
                  positionInContainer,
                  { type: "margins", left: pageTurnMargin },
                  containerElementRect,
                )
              ) {
                reader.navigation.turnLeftOrTop()
              } else if (
                computedPageTurnDirection === "vertical" &&
                isPositionInArea(
                  positionInContainer,
                  { type: "margins", top: pageTurnMargin },
                  containerElementRect,
                )
              ) {
                reader.navigation.turnLeftOrTop()
              } else if (
                computedPageTurnDirection === "vertical" &&
                isPositionInArea(
                  positionInContainer,
                  { type: "margins", bottom: pageTurnMargin },
                  containerElementRect,
                )
              ) {
                reader.navigation.turnRightOrBottom()
              } else if (
                computedPageTurnDirection === "horizontal" &&
                isPositionInArea(
                  positionInContainer,
                  { type: "margins", right: pageTurnMargin },
                  containerElementRect,
                )
              ) {
                reader.navigation.turnRightOrBottom()
              } else {
                return { event, handled: false }
              }

              return { event, handled: true }
            }),
          )
        }
      }

      return EMPTY
    }),
  )

  return gestures$
}

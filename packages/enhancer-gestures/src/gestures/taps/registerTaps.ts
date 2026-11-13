import {
  type HookManager,
  type Reader,
  reportRecoveredError,
} from "@prose-reader/core"
import type { TapRecognizer } from "gesturx"
import {
  catchError,
  defaultIfEmpty,
  defer,
  EMPTY,
  filter,
  forkJoin,
  map,
  type Observable,
  of,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs"
import type { GesturesSettingsManager } from "../../SettingsManager"
import type {
  BeforeTapGestureContext,
  GestureRecognizable,
  Hook,
} from "../../types"
import {
  getPositionRelativeToContainer,
  isNotLink,
  istMatchingSelectors,
} from "../../utils"
import { calculatePageTurnLinearMargin, isPositionInArea } from "./utils"

/** Given when no hook is registered. */
const noVerdicts: boolean[] = []

/**
 * Whether the `beforeTapGesture` hooks let a tap go on, once each has given
 * its verdict. Only a first verdict of `false` objects to the tap.
 *
 * Whatever else a hook does gives no objection, so that it cannot cost the
 * reader its gestures: a hook that completes with no verdict, errors, or
 * throws as it is called lets the tap go on, and its error is reported. Each
 * hook is asked apart, so that one that throws cancels no other hook's veto.
 */
const isTapAllowedByBeforeTapGestureHooks = (
  hookManager: HookManager<Hook>,
  tapContext: BeforeTapGestureContext,
): Observable<boolean> =>
  forkJoin(
    hookManager.getHooks("beforeTapGesture").map((hook) =>
      defer(() => hook.runFn({ event$: of(tapContext) })).pipe(
        take(1),
        catchError((error) => {
          reportRecoveredError(error)

          return EMPTY
        }),
        defaultIfEmpty(true),
      ),
    ),
  ).pipe(
    defaultIfEmpty(noVerdicts),
    map((verdicts) => !verdicts.includes(false)),
  )

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
    withLatestFrom(
      reader.context.watch(`rootElement`),
      reader.spine.watch(`element`),
    ),
    switchMap(([{ event }, containerElement, spineElement]) => {
      if (!containerElement || !spineElement) return EMPTY

      const normalizedEvent = event.event
      const { computedPageTurnDirection, computedPageTurnMode } =
        reader.settings.values

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
            ? reader.spine.locator.getSpineItemPagePositionFromSpinePosition(
                positionInSpineNonTransformed,
              )
            : undefined

          return isTapAllowedByBeforeTapGestureHooks(hookManager, {
            event,
            page: spineItemPageInfo,
          }).pipe(
            filter((isTapAllowed) => isTapAllowed),
            map(() => {
              const isZoomedIn =
                reader.zoom.state.isZooming &&
                reader.zoom.state.currentScale > 1

              if (computedPageTurnMode === "scrollable" || isZoomedIn) {
                return {
                  type: "tap" as const,
                  gestureEvent: event,
                  handled: false,
                }
              }

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
                return {
                  type: "tap" as const,
                  gestureEvent: event,
                  handled: false,
                }
              }

              return {
                type: "tap" as const,
                gestureEvent: event,
                handled: true,
              }
            }),
          )
        }
      }

      return EMPTY
    }),
  )

  return gestures$
}

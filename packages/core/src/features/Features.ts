import { isShallowEqual } from "@prose-reader/shared"
import { combineLatest, distinctUntilChanged, map, takeUntil } from "rxjs"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { CoreInputSettings } from "../settings/types"
import { ReactiveEntity } from "../utils/ReactiveEntity"

export type ContextSettings = Partial<CoreInputSettings>

type State = {
  supportedPageTurnAnimation: NonNullable<
    ContextSettings[`pageTurnAnimation`]
  >[]
  supportedPageTurnMode: NonNullable<ContextSettings[`pageTurnMode`]>[]
  supportedPageTurnDirection: NonNullable<
    ContextSettings[`pageTurnDirection`]
  >[]
  supportedComputedPageTurnDirection: NonNullable<
    ContextSettings[`pageTurnDirection`]
  >[]
}

export class Features extends ReactiveEntity<State> {
  constructor(context: Context, settingsManager: ReaderSettingsManager) {
    super({
      supportedPageTurnAnimation: [`fade`, `none`, `slide`],
      supportedPageTurnMode: [`controlled`, `scrollable`],
      supportedPageTurnDirection: [`horizontal`, `vertical`],
      supportedComputedPageTurnDirection: [`horizontal`, `vertical`],
    })

    combineLatest([
      context.watch(["manifest", "hasVerticalWriting"]),
      settingsManager.watch([`computedPageTurnMode`]),
    ])
      .pipe(
        map(([{ manifest, hasVerticalWriting }, { computedPageTurnMode }]) => ({
          hasVerticalWriting,
          renditionFlow: manifest?.renditionFlow,
          renditionLayout: manifest?.renditionLayout,
          computedPageTurnMode,
        })),
        distinctUntilChanged(isShallowEqual),
        map(
          ({
            hasVerticalWriting,
            renditionFlow,
            renditionLayout,
            computedPageTurnMode,
          }) => {
            return {
              ...this.value,
              supportedPageTurnMode:
                renditionFlow === `scrolled-continuous`
                  ? [`scrollable`]
                  : [`controlled`, `scrollable`],
              supportedPageTurnAnimation:
                renditionFlow === `scrolled-continuous` ||
                computedPageTurnMode === `scrollable`
                  ? [`none`]
                  : hasVerticalWriting
                    ? [`fade`, `none`]
                    : [`fade`, `none`, `slide`],
              supportedPageTurnDirection:
                computedPageTurnMode === `scrollable`
                  ? [`vertical`]
                  : renditionLayout === `reflowable`
                    ? [`horizontal`]
                    : [`horizontal`, `vertical`],
            } satisfies State
          },
        ),
        takeUntil(this.destroy$),
      )
      .subscribe(this.next.bind(this))
  }
}

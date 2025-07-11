import {
  HTML_ATTRIBUTE_DATA_READER_ID,
  HTML_ATTRIBUTE_VIEWPORT_CLASSNAME,
  ReactiveEntity,
  type Reader,
} from "@prose-reader/core"
import {
  combineLatest,
  distinctUntilChanged,
  map,
  type Observable,
  tap,
} from "rxjs"

export type RefitEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_REFIT: boolean
  refit: {
    update: (settings: Partial<RefitEnhancerOptions>) => void
    settings$: Observable<RefitEnhancerOptions>
  }
}

export type RefitEnhancerOptions = {
  viewportFit?: "desktop" | "tablet" | "fit" | "custom"
  customWidth?: number
}

class Settings extends ReactiveEntity<RefitEnhancerOptions> {
  update(settings: RefitEnhancerOptions) {
    super.mergeCompare(settings)
  }
}

export const refitEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions & {
      refit?: Partial<RefitEnhancerOptions>
    },
  ): InheritOutput & RefitEnhancerAPI => {
    const { refit = {}, ...rest } = options
    const reader = next(rest as InheritOptions)
    const settings = new Settings(refit)
    const stylesheetId = `prose-reader-refit-${reader.id}`
    const maxWidthCssVariable = `--${stylesheetId}-max-width`

    const style = document.createElement("style")
    style.id = stylesheetId
    style.textContent = `
      [${HTML_ATTRIBUTE_DATA_READER_ID}] .${HTML_ATTRIBUTE_VIEWPORT_CLASSNAME} {
        margin: auto;
        width: 100%;
        max-width: var(${maxWidthCssVariable});
      }
    `

    document.head.appendChild(style)

    const viewportFitSubscription = combineLatest([
      settings.watch(["viewportFit", "customWidth"]),
      reader.settings.watch(["computedPageTurnMode"]),
    ])
      .pipe(
        map(([{ viewportFit, customWidth }, { computedPageTurnMode }]) => {
          if (computedPageTurnMode === "scrollable") {
            if (viewportFit === "desktop") {
              return "800px"
            }

            if (viewportFit === "tablet") {
              return "600px"
            }

            if (viewportFit === "custom") {
              return `${customWidth ?? 100}%`
            }
          }

          return "100%"
        }),
        distinctUntilChanged(),
        tap((maxWidth) => {
          document.documentElement.style.setProperty(
            maxWidthCssVariable,
            maxWidth,
          )
          reader.layout()
        }),
      )
      .subscribe()

    const destroy = () => {
      viewportFitSubscription.unsubscribe()
      document.head.removeChild(style)
      reader.destroy()
    }

    return {
      ...reader,
      __PROSE_READER_ENHANCER_REFIT: true,
      destroy,
      refit: {
        update: settings.update.bind(settings),
        settings$: settings,
      },
    }
  }

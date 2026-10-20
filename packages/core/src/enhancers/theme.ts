import { BehaviorSubject, type Observable, takeUntil, tap } from "rxjs"
import type { SpineItem } from "../spineItem/SpineItem"
import { setStylePropertyIfChanged } from "../utils/dom"
import { upsertCSSToFrame } from "../utils/frames"
import type { EnhancerOutput, RootEnhancer } from "./types/enhancer"

export type Theme = `bright` | `sepia` | `night` | `publisher`

type ThemeColors = {
  backgroundColor?: string
  foregroundColor?: string
}

/**
 * `publisher` overrides nothing: documents keep their own colors.
 */
const themeColors: Record<Theme, ThemeColors> = {
  bright: {
    backgroundColor: `white`,
  },
  sepia: {
    backgroundColor: `#eaddc7`,
    foregroundColor: `black`,
  },
  night: {
    backgroundColor: `#191717`,
    foregroundColor: `#f1ebeb`,
  },
  publisher: {},
}

const getDocumentStyle = ({
  backgroundColor,
  foregroundColor,
}: ThemeColors) => `
  body {
    ${backgroundColor ? `background-color: ${backgroundColor} !important;` : ``}
  }
  ${
    foregroundColor
      ? `
      body * {
        ${
          /*
          Ideally, we would like to use !important but it could break publisher specific
          cases
        */ ``
        }
        color: ${foregroundColor};
      }
    `
      : ``
  }
`

export type ThemeEnhancerOutput = {
  set: (theme: Theme) => void
  get: () => Theme
  $: {
    theme$: Observable<Theme>
  }
}

export type ThemeEnhancer = <
  InheritOptions,
  InheritOutput extends EnhancerOutput<RootEnhancer>,
>(
  next: (options: InheritOptions) => InheritOutput,
) => (
  options: InheritOptions & {
    theme?: Theme
  },
) => InheritOutput & {
  theme: ThemeEnhancerOutput
}

export const themeEnhancer: ThemeEnhancer = (next) => (options) => {
  const reader = next(options)
  const currentThemeSubject$ = new BehaviorSubject<Theme>(
    options.theme ?? `bright`,
  )

  /**
   * A pre-paginated document keeps its own look and the theme shows around
   * it. Its document may not even be the page: the pdf renderer's frame holds
   * the text layer, blended over the page it renders on a canvas.
   */
  const applyThemeToItemDocument = (item: SpineItem) => {
    if (item.renditionLayout === `pre-paginated`) return

    upsertCSSToFrame(
      item.renderer.getDocumentFrame(),
      `prose-reader-theme`,
      getDocumentStyle(themeColors[currentThemeSubject$.value]),
    )
  }

  reader.hookManager.register(`item.onDocumentLoad`, async ({ itemId }) => {
    const item = reader.spineItemsManager.get(itemId)

    if (item) applyThemeToItemDocument(item)
  })

  currentThemeSubject$
    .pipe(
      tap((theme) => {
        const { backgroundColor } = themeColors[theme]

        reader.spineItemsManager.items.forEach((item) => {
          applyThemeToItemDocument(item)

          if (backgroundColor) {
            setStylePropertyIfChanged(
              item.element.style,
              `background-color`,
              backgroundColor,
            )
          }
        })
      }),
      takeUntil(reader.$.destroy$),
    )
    .subscribe()

  return {
    ...reader,
    theme: {
      set: (theme) => {
        if (theme !== currentThemeSubject$.value) {
          currentThemeSubject$.next(theme)
        }
      },
      get: () => currentThemeSubject$.value,
      $: {
        theme$: currentThemeSubject$.asObservable(),
      },
    },
  }
}

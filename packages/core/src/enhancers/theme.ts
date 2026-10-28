import {
  BehaviorSubject,
  filter,
  finalize,
  merge,
  type Observable,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import { CSS_VAR_THEME_BACKGROUND_COLOR } from "../constants"
import type { SpineItem } from "../spineItem/SpineItem"
import {
  removeStylePropertyIfPresent,
  setStylePropertyIfChanged,
} from "../utils/dom"
import { upsertCSSToFrame } from "../utils/frames"
import { isDefined } from "../utils/isDefined"
import type { EnhancerOutput, RootEnhancer } from "./types/enhancer"

export type Theme = `bright` | `sepia` | `night` | `publisher`

type ThemeColors = {
  backgroundColor?: string
  foregroundColor?: string
}

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

/**
 * The background the reader paints with `theme`. With `publisher`, the book
 * keeps its own background, on a white reader.
 */
export const getThemeBackgroundColor = (theme: Theme) =>
  themeColors[theme].backgroundColor ?? `white`

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
   * A pre-paginated document is left as its publisher laid it out. Its frame
   * may not even hold the page: the pdf renderer's holds the text layer,
   * blended over the page it renders on a canvas.
   */
  const applyThemeToItemDocument = (item: SpineItem, theme: Theme) => {
    if (item.renditionLayout === `pre-paginated`) return

    upsertCSSToFrame(
      item.renderer.getDocumentFrame(),
      `prose-reader-theme`,
      getDocumentStyle(themeColors[theme]),
    )
  }

  reader.hookManager.register(`item.onDocumentLoad`, async ({ itemId }) => {
    const item = reader.spineItemsManager.get(itemId)

    if (item) applyThemeToItemDocument(item, currentThemeSubject$.value)
  })

  const applyThemeToLoadedDocuments$ = currentThemeSubject$.pipe(
    tap((theme) => {
      reader.spineItemsManager.items.forEach((item) => {
        applyThemeToItemDocument(item, theme)
      })
    }),
  )

  /**
   * The reader's stylesheet paints its container, and the placeholder of an
   * item that is loading, with this variable.
   */
  const applyThemeToContainer$ = reader.context.watch(`rootElement`).pipe(
    filter(isDefined),
    switchMap((rootElement) =>
      currentThemeSubject$.pipe(
        tap((theme) => {
          setStylePropertyIfChanged(
            rootElement.style,
            CSS_VAR_THEME_BACKGROUND_COLOR,
            getThemeBackgroundColor(theme),
          )
        }),
        finalize(() => {
          removeStylePropertyIfPresent(
            rootElement.style,
            CSS_VAR_THEME_BACKGROUND_COLOR,
          )
        }),
      ),
    ),
  )

  merge(applyThemeToLoadedDocuments$, applyThemeToContainer$)
    .pipe(takeUntil(reader.$.destroy$))
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

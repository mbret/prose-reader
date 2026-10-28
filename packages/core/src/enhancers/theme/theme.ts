import { filter, finalize, map, merge, switchMap, takeUntil, tap } from "rxjs"
import {
  CSS_VAR_THEME_BACKGROUND_COLOR,
  CSS_VAR_THEME_PLACEHOLDER_COLOR,
} from "../../constants"
import type { ExtendedSettings } from "../../settings/SettingsInterface"
import type { SpineItem } from "../../spineItem/SpineItem"
import {
  removeStylePropertyIfPresent,
  setStylePropertyIfChanged,
} from "../../utils/dom"
import { upsertCSSToFrame } from "../../utils/frames"
import { isDefined } from "../../utils/isDefined"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import type { EnhancerThemeInputSettings, Theme } from "./types"

const defaultThemeSettings: EnhancerThemeInputSettings = {
  theme: `bright`,
}

type ThemeColors = {
  backgroundColor?: string
  foregroundColor?: string
  placeholderTextColor: string
}

const themeColors: Record<Theme, ThemeColors> = {
  bright: {
    backgroundColor: `white`,
    placeholderTextColor: `rgb(202, 202, 202)`,
  },
  sepia: {
    backgroundColor: `#eaddc7`,
    foregroundColor: `black`,
    placeholderTextColor: `#939393`,
  },
  night: {
    backgroundColor: `#191717`,
    foregroundColor: `#f1ebeb`,
    placeholderTextColor: `rgb(202, 202, 202)`,
  },
  publisher: {
    placeholderTextColor: `rgb(202, 202, 202)`,
  },
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

export const themeEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions & Partial<EnhancerThemeInputSettings>,
  ): Omit<InheritOutput, "settings"> & {
    settings: ExtendedSettings<
      InheritOutput["settings"],
      EnhancerThemeInputSettings
    >
  } => {
    const reader = next(options)
    const inheritedSettings: InheritOutput["settings"] = reader.settings
    const settings = inheritedSettings.extend(defaultThemeSettings, options)
    const theme$ = settings.watch([`theme`]).pipe(map(({ theme }) => theme))

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

      if (item) applyThemeToItemDocument(item, settings.values.theme)
    })

    const applyThemeToLoadedDocuments$ = theme$.pipe(
      tap((theme) => {
        reader.spineItemsManager.items.forEach((item) => {
          applyThemeToItemDocument(item, theme)
        })
      }),
    )

    /**
     * The reader's stylesheet paints its container, and the placeholder of an
     * item that is loading, with these variables.
     */
    const applyThemeToContainer$ = reader.context.watch(`rootElement`).pipe(
      filter(isDefined),
      switchMap((rootElement) =>
        theme$.pipe(
          tap((theme) => {
            setStylePropertyIfChanged(
              rootElement.style,
              CSS_VAR_THEME_BACKGROUND_COLOR,
              getThemeBackgroundColor(theme),
            )
            setStylePropertyIfChanged(
              rootElement.style,
              CSS_VAR_THEME_PLACEHOLDER_COLOR,
              themeColors[theme].placeholderTextColor,
            )
          }),
          finalize(() => {
            removeStylePropertyIfPresent(
              rootElement.style,
              CSS_VAR_THEME_BACKGROUND_COLOR,
            )
            removeStylePropertyIfPresent(
              rootElement.style,
              CSS_VAR_THEME_PLACEHOLDER_COLOR,
            )
          }),
        ),
      ),
    )

    merge(applyThemeToLoadedDocuments$, applyThemeToContainer$)
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return { ...reader, settings }
  }

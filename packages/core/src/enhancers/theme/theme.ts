import { filter, finalize, merge, switchMap, takeUntil, tap } from "rxjs"
import { CSS_VAR_THEME_BACKGROUND_COLOR } from "../../constants"
import type { SettingsInterface } from "../../settings/SettingsInterface"
import type { SpineItem } from "../../spineItem/SpineItem"
import {
  removeStylePropertyIfPresent,
  setStylePropertyIfChanged,
} from "../../utils/dom"
import { upsertCSSToFrame } from "../../utils/frames"
import { isDefined } from "../../utils/isDefined"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { SettingsManager } from "./SettingsManager"
import type { EnhancerThemeInputSettings, Theme } from "./types"

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

export const themeEnhancer =
  <
    InheritOptions,
    InheritOutput extends EnhancerOutput<RootEnhancer>,
    InheritSettings extends NonNullable<
      InheritOutput["settings"]["_inputSettings"]
    >,
    InheritComputedSettings extends NonNullable<
      InheritOutput["settings"]["_outputSettings"]
    >,
    Output extends Omit<InheritOutput, "settings"> & {
      settings: SettingsInterface<
        InheritSettings & EnhancerThemeInputSettings,
        EnhancerThemeInputSettings & InheritComputedSettings
      >
    },
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions & Partial<EnhancerThemeInputSettings>): Output => {
    const reader = next(options)
    const settingsManager = new SettingsManager<
      InheritSettings,
      InheritComputedSettings
    >(
      { theme: options.theme },
      // Cast: `InheritSettings` and `InheritComputedSettings` are read from
      // `reader.settings`, but TypeScript does not relate a generic back to
      // the type it was read from.
      reader.settings as SettingsInterface<
        InheritSettings,
        InheritComputedSettings
      >,
    )
    const theme$ = settingsManager.watch(`theme`)

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

      if (item) applyThemeToItemDocument(item, settingsManager.values.theme)
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
     * item that is loading, with this variable.
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

    // Cast: the object is built from a generic `InheritOutput`, which
    // TypeScript cannot match to `Output`, a type the caller may narrow.
    return {
      ...reader,
      destroy: () => {
        settingsManager.destroy()
        reader.destroy()
      },
      settings: settingsManager,
    } as unknown as Output
  }

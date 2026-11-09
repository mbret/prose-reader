import { skip, takeUntil, tap } from "rxjs"
import type { ExtendedSettings } from "../../settings/SettingsInterface"
import type { SpineItem } from "../../spineItem/SpineItem"
import { upsertCSSToFrame } from "../../utils/frames"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import type { EnhancerFontsInputSettings } from "./types"

const FONTS_STYLESHEET_ID = `prose-reader-fonts`

const defaultFontsSettings: EnhancerFontsInputSettings = {
  fontScale: 1,
  fontWeight: `publisher`,
  lineHeight: `publisher`,
  fontJustification: `publisher`,
}

const getFontsStylesheet = ({
  fontScale,
  lineHeight,
  fontWeight,
  fontJustification,
}: EnhancerFontsInputSettings) => `
  body {
    ${fontScale !== 1 ? `font-size: ${fontScale}em !important;` : ``}
    ${lineHeight !== `publisher` ? `line-height: ${lineHeight} !important;` : ``}
    ${fontWeight !== `publisher` ? `font-weight: ${fontWeight} !important;` : ``}
    ${fontJustification !== `publisher` ? `text-align: ${fontJustification} !important;` : ``}
  }
`

const keepsPublisherFonts = (spineItem: SpineItem) =>
  spineItem.renditionLayout === `pre-paginated`

export const fontsEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions & Partial<EnhancerFontsInputSettings>,
  ): Omit<InheritOutput, "settings"> & {
    settings: ExtendedSettings<
      InheritOutput["settings"],
      EnhancerFontsInputSettings
    >
  } => {
    const reader = next(options)
    const inheritedSettings: InheritOutput["settings"] = reader.settings
    const settings = inheritedSettings.extend(defaultFontsSettings, options)

    const applyFontsStylesheet = (spineItem: SpineItem) => {
      upsertCSSToFrame(
        spineItem.renderer.getDocumentFrame(),
        FONTS_STYLESHEET_ID,
        getFontsStylesheet(settings.values),
      )
    }

    reader.hookManager.register(`item.onBeforeLayout`, ({ item }) => {
      const spineItem = reader.spineItemsManager.get(item.id)

      if (spineItem && !keepsPublisherFonts(spineItem)) {
        applyFontsStylesheet(spineItem)
      }
    })

    const fontsSettingsChange$ = settings
      .watch([`fontScale`, `lineHeight`, `fontWeight`, `fontJustification`])
      .pipe(skip(1))

    fontsSettingsChange$
      .pipe(
        tap(() => reader.layout()),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    return { ...reader, settings }
  }

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

/**
 * @important
 * Setting the font scale on body still has a chance to break publisher potential
 * font size on body if they already use something.
 * @see 9782714493743
 *
 * Ideally, we would like to use !important but it could break publisher specific
 * cases.
 * Also right now we do not apply it to * since it would also break publisher
 * more specific scaling down the tree.
 *
 * body *:not([class^="mjx-"]) {
 */
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

/**
 * @important
 * We don't apply font scaling on pre-paginated because it could potentially
 * break publisher scaling. Since it's specifically made for the given fixed layout
 * we should trust the publisher and not break its rendering.
 * @see 9781250213662
 */
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

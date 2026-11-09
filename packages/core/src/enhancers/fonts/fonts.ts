import { skip, takeUntil, tap } from "rxjs"
import type { ExtendedSettings } from "../../settings/SettingsInterface"
import { upsertCSSToFrame } from "../../utils/frames"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import type { EnhancerFontsInputSettings } from "./types"

const defaultFontsSettings: EnhancerFontsInputSettings = {
  fontScale: 1,
  fontWeight: `publisher`,
  lineHeight: `publisher`,
  fontJustification: `publisher`,
}

/**
 * @important
 * We don't apply font scaling on pre-paginated because it could potentially
 * break publisher scaling. Since it's specifically made for the given fixed layout
 * we should trust the publisher and not break its rendering.
 * @see 9781250213662
 *
 * Setting the font scale on body still has a chance to break publisher potential
 * font size on body if they already use something.
 * @see 9782714493743
 */
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

    const getFontsStylesheet = () => `
    ${
      /*
      Ideally, we would like to use !important but it could break publisher specific
      cases.
      Also right now we do not apply it to * since it would also break publisher
      more specific scaling down the tree.

      body *:not([class^="mjx-"]) {
    */ ``
    }
    body {
      ${settings.values.fontScale !== 1 ? `font-size: ${settings.values.fontScale}em !important;` : ``}
      ${settings.values.lineHeight !== `publisher` ? `line-height: ${settings.values.lineHeight} !important;` : ``}
      ${settings.values.fontWeight !== `publisher` ? `font-weight: ${settings.values.fontWeight} !important;` : ``}
      ${settings.values.fontJustification !== `publisher` ? `text-align: ${settings.values.fontJustification} !important;` : ``}
    }
  `

    /**
     * Each layout of an item measures its document, the first one after the
     * document loads included, so the document gets the settings as they are
     * just before it.
     */
    reader.hookManager.register(`item.onBeforeLayout`, ({ item }) => {
      const spineItem = reader.spineItemsManager.get(item.id)

      if (!spineItem || spineItem.renditionLayout === `pre-paginated`) return

      upsertCSSToFrame(
        spineItem.renderer.getDocumentFrame(),
        `prose-reader-fonts`,
        getFontsStylesheet(),
      )
    })

    /**
     * A change can make the text take more or fewer lines, and so change the
     * number of pages of a reflowable item. A change of weight can do this too,
     * because the bold face of a font usually has wider glyphs.
     */
    settings
      .watch([`fontScale`, `lineHeight`, `fontWeight`, `fontJustification`])
      .pipe(
        skip(1),
        tap(() => reader.layout()),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    return { ...reader, settings }
  }

import { skip, takeUntil, tap } from "rxjs"
import type { ExtendedSettings } from "../../settings/SettingsInterface"
import type { SpineItem } from "../../spineItem/SpineItem"
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

    const getStyle = () => `
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

    const applyStyleToSpineItem = (item: SpineItem | undefined) => {
      if (!item || item.renditionLayout === `pre-paginated`) return

      const frame = item.renderer.getDocumentFrame()

      if (frame) {
        upsertCSSToFrame(frame, `prose-reader-fonts`, getStyle())
      }
    }

    reader.hookManager.register(`item.onDocumentLoad`, async ({ itemId }) => {
      applyStyleToSpineItem(reader.spineItemsManager.get(itemId))
    })

    /**
     * A change restyles the loaded items, then lays the book out again: the
     * text can take more or fewer lines, and so a reflowable item more or
     * fewer pages. A bolder weight does too, as a font's bold face has wider
     * glyphs. A justification change keeps every line, and is laid out all the
     * same, rather than have a list of the settings that can move the text.
     */
    settings
      .watch([`fontScale`, `lineHeight`, `fontWeight`, `fontJustification`])
      .pipe(
        // the settings the reader starts with, which loaded items get on load
        skip(1),
        tap(() => {
          reader.spineItemsManager.items.forEach(applyStyleToSpineItem)
          reader.layout()
        }),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    return { ...reader, settings }
  }

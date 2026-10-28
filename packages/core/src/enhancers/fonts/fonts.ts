import {
  map,
  type Observable,
  type ObservedValueOf,
  pairwise,
  takeUntil,
  tap,
} from "rxjs"
import type { SettingsInterface } from "../../settings/SettingsInterface"
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
        InheritSettings & EnhancerFontsInputSettings,
        EnhancerFontsInputSettings & InheritComputedSettings
      >
    },
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions & Partial<EnhancerFontsInputSettings>): Output => {
    const reader = next(options)
    const settings = reader.settings.extend(defaultFontsSettings, options)

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

    /**
     * Programmatically update every loaded items
     */
    const applyChangeToSpineItems = (requireLayout: boolean) => {
      reader.spineItemsManager.items.forEach((item) => {
        if (item.renditionLayout !== `pre-paginated`) {
          const frame = item.renderer.getDocumentFrame()

          if (frame) {
            upsertCSSToFrame(frame, `prose-reader-fonts`, getStyle())
          }
        }
      })

      if (requireLayout) {
        reader.layout()
      }
    }

    /**
     * Make sure we apply the style to any new item loaded.
     */
    reader.hookManager.register(`item.onDocumentLoad`, async ({ itemId }) => {
      const item = reader.spineItemsManager.get(itemId)

      if (item?.renditionLayout !== `pre-paginated`) {
        const frame = item?.renderer.getDocumentFrame()

        if (frame) {
          upsertCSSToFrame(frame, `prose-reader-fonts`, getStyle())
        }
      }
    })

    const fontsSettings$ = settings.watch([
      `fontScale`,
      `lineHeight`,
      `fontWeight`,
      `fontJustification`,
    ])

    const shouldRequireLayout = <
      T extends ObservedValueOf<typeof fontsSettings$>,
    >(
      source: Observable<T>,
    ) =>
      source.pipe(
        pairwise(),
        map(([old, latest]) => {
          if (latest.fontScale !== old.fontScale) return true
          if (latest.lineHeight !== old.lineHeight) return true

          return false
        }),
      )

    fontsSettings$
      .pipe(
        shouldRequireLayout,
        tap(applyChangeToSpineItems),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    // Cast: the reader is a generic `InheritOutput`, which TypeScript cannot
    // match to `Output`, a type the caller may narrow.
    return reader as unknown as Output
  }

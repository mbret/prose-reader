/* eslint-disable @typescript-eslint/no-explicit-any */
import { map, Observable, ObservedValueOf, Subject, takeUntil } from "rxjs"
import { tap, pairwise } from "rxjs/operators"
import {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { InputSettings } from "./types"
import { SettingsManager } from "./SettingsManager"
import { SettingsInterface } from "../../settings/SettingsInterface"

type OutputOptions = Required<InputSettings>

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
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer>,
    InheritSettings extends NonNullable<
      InheritOutput["settings"]["_inputSettings"]
    >,
    InheritComputedSettings extends NonNullable<
      InheritOutput["settings"]["_outputSettings"]
    >,
    Output extends Omit<InheritOutput, "settings"> & {
      settings: SettingsInterface<
        InheritSettings & InputSettings,
        InputSettings & InheritComputedSettings
      >
    },
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions & Partial<InputSettings>): Output => {
    const { fontScale, lineHeight, fontWeight, fontJustification } = options
    const changes$ = new Subject<Partial<OutputOptions>>()
    const reader = next(options)

    const settingsManager = new SettingsManager<
      InheritSettings,
      InheritComputedSettings
    >(
      {
        fontScale,
        lineHeight,
        fontWeight,
        fontJustification,
      },
      reader.settings as SettingsInterface<
        InheritSettings,
        InheritComputedSettings
      >,
    )

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
      ${settingsManager.settings.fontScale !== 1 ? `font-size: ${settingsManager.settings.fontScale}em !important;` : ``}
      ${settingsManager.settings.lineHeight !== `publisher` ? `line-height: ${settingsManager.settings.lineHeight} !important;` : ``}
      ${settingsManager.settings.fontWeight !== `publisher` ? `font-weight: ${settingsManager.settings.fontWeight} !important;` : ``}
      ${settingsManager.settings.fontJustification !== `publisher` ? `text-align: ${settingsManager.settings.fontJustification} !important;` : ``}
    }
  `

    /**
     * Programmatically update every loaded items
     */
    const applyChangeToSpineItems = (requireLayout: boolean) => {
      reader.spineItemsManager.items.forEach((item) => {
        if (item.item.renditionLayout !== `pre-paginated`) {
          item.frame.removeStyle?.(`prose-reader-fonts`)
          item.frame.addStyle?.(`prose-reader-fonts`, getStyle())
        }
      })

      if (requireLayout) {
        reader.layout()
      }
    }

    /**
     * Make sure we apply the style to any new item loaded.
     */
    reader.hookManager.register(`item.onLoad`, ({ itemId }) => {
      const item = reader.spineItemsManager.get(itemId)

      item?.manipulateSpineItem(({ addStyle, removeStyle }) => {
        if (item.item.renditionLayout !== `pre-paginated`) {
          removeStyle(`prose-reader-fonts`)
          addStyle(`prose-reader-fonts`, getStyle())
        }

        return false
      })
    })

    const shouldRequireLayout = <T extends ObservedValueOf<typeof changes$>>(
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

    settingsManager.settings$
      .pipe(
        shouldRequireLayout,
        tap(applyChangeToSpineItems),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    return {
      ...reader,
      destroy: () => {
        changes$.complete()
        settingsManager.destroy()
        reader.destroy()
      },
      settings: settingsManager,
    } as unknown as Output
  }

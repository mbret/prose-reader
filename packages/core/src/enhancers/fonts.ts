/* eslint-disable @typescript-eslint/no-explicit-any */
import { BehaviorSubject, combineLatest, map, Observable, ObservedValueOf, Subject, takeUntil } from "rxjs"
import { tap, pairwise, withLatestFrom, distinctUntilChanged, shareReplay } from "rxjs/operators"
import { isShallowEqual } from "../utils/objects"
import { EnhancerOptions, EnhancerOutput, RootEnhancer } from "./types/enhancer"

const FONT_WEIGHT = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const
const FONT_JUSTIFICATION = [`center`, `left`, `right`, `justify`] as const

type Options = {
  /**
   * @description
   * Scale the font size. 1 means use default publisher/browser font size, 2 means 200%
   * 0.5 50%, etc
   */
  fontScale?: number
  /**
   * @description
   * Set the line height of the text. The default value is 1
   */
  lineHeight?: number | `publisher`
  /**
   * @description
   * Set font weight of text
   */
  fontWeight?: (typeof FONT_WEIGHT)[number] | `publisher`
  /**
   * @description
   * Set text align justification
   */
  fontJustification?: (typeof FONT_JUSTIFICATION)[number] | `publisher`
}

type OutputOptions = Required<Options>

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
    SetSettings extends (settings: Parameters<InheritOutput["settings"]["setSettings"]>[0] & Options) => void,
    Settings$ extends Observable<ObservedValueOf<InheritOutput["settings"]["settings$"]> & OutputOptions>,
    Output extends Omit<InheritOutput, "settings"> & {
      settings: Omit<InheritOutput["settings"], "setSettings" | "settings$"> & {
        settings$: Settings$
        setSettings: SetSettings
      }
    },
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions & Options): Output => {
    const { fontScale = 1, lineHeight = `publisher`, fontWeight = `publisher`, fontJustification = `publisher` } = options
    const changes$ = new Subject<Partial<OutputOptions>>()
    const settings$ = new BehaviorSubject<OutputOptions>({
      fontScale,
      lineHeight,
      fontWeight,
      fontJustification,
    })
    const reader = next(options)

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
      ${settings$.value.fontScale !== 1 ? `font-size: ${settings$.value.fontScale}em !important;` : ``}
      ${settings$.value.lineHeight !== `publisher` ? `line-height: ${settings$.value.lineHeight} !important;` : ``}
      ${settings$.value.fontWeight !== `publisher` ? `font-weight: ${settings$.value.fontWeight} !important;` : ``}
      ${settings$.value.fontJustification !== `publisher` ? `text-align: ${settings$.value.fontJustification} !important;` : ``}
    }
  `

    /**
     * Programmatically update every loaded items
     */
    const applyChangeToSpineItem = (requireLayout: boolean) => {
      reader.spine.manipulateSpineItems(({ removeStyle, addStyle, item }) => {
        if (item.renditionLayout !== `pre-paginated`) {
          removeStyle(`prose-reader-fonts`)
          addStyle(`prose-reader-fonts`, getStyle())
        }

        return requireLayout
      })
    }

    /**
     * Make sure we apply the style to any new item loaded.
     */
    reader.registerHook(`item.onLoad`, ({ removeStyle, addStyle, item }) => {
      if (item.renditionLayout !== `pre-paginated`) {
        removeStyle(`prose-reader-fonts`)
        addStyle(`prose-reader-fonts`, getStyle())
      }
    })

    const shouldRequireLayout = <T extends ObservedValueOf<typeof changes$>>(source: Observable<T>) =>
      source.pipe(
        pairwise(),
        map(([old, latest]) => {
          if (latest.fontScale !== old.fontScale) return true
          if (latest.lineHeight !== old.lineHeight) return true

          return false
        }),
      )

    const newSettings$ = changes$.pipe(
      withLatestFrom(settings$),
      map(([changes, settings]) => ({
        fontJustification: changes.fontJustification ?? settings.fontJustification,
        fontWeight: changes.fontWeight ?? settings.fontWeight,
        lineHeight: changes.lineHeight ?? settings.lineHeight,
        fontScale: Math.max(0.01, changes.fontScale ?? settings.fontScale),
      })),
      distinctUntilChanged(isShallowEqual),
      shareReplay(1),
    )

    newSettings$.subscribe(settings$)

    settings$.pipe(shouldRequireLayout, tap(applyChangeToSpineItem), takeUntil(reader.$.destroy$)).subscribe()

    const settingsMerge$ = combineLatest([reader.settings.settings$, settings$]).pipe(
      map(([innerSettings, settings]) => ({
        ...innerSettings,
        ...(settings as ObservedValueOf<Settings$>),
      })),
    )

    const setSettings = ((settings) => {
      const { fontJustification, fontScale, fontWeight, lineHeight, ...passthroughSettings } = settings
      changes$.next({ fontJustification, fontScale, fontWeight, lineHeight })

      reader.settings.setSettings(passthroughSettings)
    }) as SetSettings

    return {
      ...reader,
      destroy: () => {
        changes$.complete()
        settings$.complete()
        reader.destroy()
      },
      settings: {
        ...reader.settings,
        setSettings,
        settings$: settingsMerge$,
      },
    } as unknown as Output
  }

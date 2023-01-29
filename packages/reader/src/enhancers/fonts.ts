import { BehaviorSubject, combineLatest, map, Observable, ObservedValueOf, takeUntil } from "rxjs"
import { tap, pairwise } from "rxjs/operators"
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
    Settings$ extends Observable<any> = InheritOutput["settings$"]
  >(
    next: (options: InheritOptions) => InheritOutput
  ) =>
  (
    options: InheritOptions & Options
  ): Omit<InheritOutput, "setSettings" | "settings$"> & {
    settings$: Observable<ObservedValueOf<Settings$> & OutputOptions>
    setSettings: (settings: Parameters<InheritOutput["setSettings"]>[0] & Options) => void
  } => {
    const { fontScale = 1, lineHeight = `publisher`, fontWeight = `publisher`, fontJustification = `publisher` } = options
    const settingsSubject$ = new BehaviorSubject<OutputOptions>({
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
      ${settingsSubject$.value.fontScale !== 1 ? `font-size: ${settingsSubject$.value.fontScale}em !important;` : ``}
      ${settingsSubject$.value.lineHeight !== `publisher` ? `line-height: ${settingsSubject$.value.lineHeight} !important;` : ``}
      ${settingsSubject$.value.fontWeight !== `publisher` ? `font-weight: ${settingsSubject$.value.fontWeight} !important;` : ``}
      ${
        settingsSubject$.value.fontJustification !== `publisher`
          ? `text-align: ${settingsSubject$.value.fontJustification} !important;`
          : ``
      }
    }
  `

    /**
     * Programmatically update every loaded items
     */
    const applyChangeToSpineItem = (requireLayout: boolean) => {
      reader.manipulateSpineItems(({ removeStyle, addStyle, item }) => {
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

    const shouldRequireLayout = <T extends ObservedValueOf<typeof settingsSubject$>>(source: Observable<T>) =>
      source.pipe(
        pairwise(),
        map(([old, latest]) => {
          if (latest.fontScale !== old.fontScale) return true
          if (latest.lineHeight !== old.lineHeight) return true

          return false
        })
      )

    settingsSubject$
      .asObservable()
      .pipe(shouldRequireLayout, tap(applyChangeToSpineItem), takeUntil(reader.$.destroy$))
      .subscribe()

    const settings$ = combineLatest([reader.settings$, settingsSubject$]).pipe(
      map(([innerSettings, settings]) => ({
        ...innerSettings,
        ...(settings as ObservedValueOf<Settings$>),
      }))
    )

    return {
      ...reader,
      /**
       * Absorb current enhancer settings and passthrough the rest to reader
       */
      setSettings: (settings) => {
        const {
          fontJustification = settingsSubject$.value.fontJustification,
          fontScale = settingsSubject$.value.fontScale,
          fontWeight = settingsSubject$.value.fontWeight,
          lineHeight = settingsSubject$.value.lineHeight,
          ...passthroughSettings
        } = settings

        if (hasOneKey(settings, [`fontJustification`, `fontScale`, `fontWeight`, `lineHeight`])) {
          settingsSubject$.next({ fontJustification, fontScale, fontWeight, lineHeight })
        }
        reader.setSettings(passthroughSettings)
      },
      /**
       * Combine reader settings with enhancer settings
       */
      settings$,
    }
  }

const hasOneKey = <Obj extends Record<string, unknown>, Key extends keyof Obj>(obj: Obj, keys: Key[]) =>
  keys.some((key) => key in obj)

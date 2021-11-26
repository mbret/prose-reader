import { BehaviorSubject, combineLatest } from "rxjs"
import { distinctUntilChanged, map, takeUntil, tap, skip } from "rxjs/operators"
import { Enhancer } from "../types"
import { createMovingSafePan$ } from "./createMovingSafePan$"
import { mapKeysTo } from "../../utils/rxjs"
import { isShallowEqual } from "../../utils/objects"

const SHOULD_NOT_LAYOUT = false

type SettingsInput = {
  pageHorizontalMargin?: number,
  pageVerticalMargin?: number,
}

type SettingsOutput = Required<SettingsInput>

export const layoutEnhancer: Enhancer<SettingsInput & {
  /**
   * Can be used to let the reader automatically resize.
   * `container`: observe and resize the reader whenever the container resize.
   * `false`: do not automatically resize.
   */
  layoutAutoResize?: `container` | false
}, {}, SettingsInput, SettingsOutput> = (next) => ({ pageHorizontalMargin = 24, pageVerticalMargin = 24, ...options }) => {
  const reader = next(options)
  const settingsSubject$ = new BehaviorSubject<SettingsOutput>({
    pageHorizontalMargin,
    pageVerticalMargin
  })

  reader.registerHook(`onViewportOffsetAdjust`, () => {
    let hasRedrawn = false

    /**
     * When adjusting the offset, there is a chance that pointer event being dispatched right after
     * have a wrong `clientX` / `pageX` etc. This is because even if the iframe left value (once requested) is correct,
     * it does not seem to have been correctly taken by the browser when creating the event.
     * What we do here is that after a viewport adjustment we immediately force a reflow on the engine.
     *
     * @example
     * [pointer event] -> clientX = 50, left = 0, translated clientX = 50 (CORRECT)
     * [translate viewport] -> left = +100px
     * [pointer event] -> clientX = ~50, left = -100, translated clientX = ~-50 (INCORRECT)
     * [pointer event] -> clientX = 150, left = -100, translated clientX = 50 (CORRECT)
     *
     * For some reason the engine must be doing some optimization and unfortunately the first pointer event gets the clientX wrong.
     *
     * The bug can be observed by commenting this code, using CPU slowdown and increasing the throttle on the adjustment stream.
     * The bug seems to affect only chrome / firefox. Nor safari.
     *
     * Also we only need to use `getBoundingClientRect` once.
     *
     * @todo
     * Consider creating a bug ticket on both chromium and gecko projects.
     */
    reader.manipulateSpineItems(({ frame }) => {
      if (!hasRedrawn && frame) {
        /* eslint-disable-next-line no-void */
        void (frame.getBoundingClientRect().left)
        hasRedrawn = true
      }

      return SHOULD_NOT_LAYOUT
    })
  })

  /**
   * Apply margins to frame item
   * @todo memoize
   */
  reader.registerHook(`item.onLayoutBeforeMeasurment`, ({ frame, minimumWidth, item, isImageType }) => {
    const { pageHorizontalMargin = 0, pageVerticalMargin = 0 } = settingsSubject$.value
    const pageSize = reader.context.getPageSize()

    if (
      item.renditionLayout === `reflowable` &&
      frame.getIsReady() &&
      !isImageType() &&
      !frame.getViewportDimensions()
    ) {
      let columnWidth = pageSize.width - (pageHorizontalMargin * 2)
      const columnHeight = pageSize.height - (pageVerticalMargin * 2)
      let width = pageSize.width - (pageHorizontalMargin * 2)
      let columnGap = pageHorizontalMargin * 2

      if (frame.isUsingVerticalWriting()) {
        width = minimumWidth - (pageHorizontalMargin * 2)
        columnWidth = columnHeight
        columnGap = pageVerticalMargin * 2
      }

      frame.getManipulableFrame()?.removeStyle(`prose-layout-enhancer-css`)
      frame.getManipulableFrame()?.addStyle(`prose-layout-enhancer-css`, `
        body {
          width: ${width}px !important;
          margin: ${pageVerticalMargin}px ${pageHorizontalMargin}px !important;
          column-gap: ${columnGap}px !important;
          column-width: ${columnWidth}px !important;
          height: ${columnHeight}px !important;
        }
        img, video, audio, object, svg {
          max-width: ${columnWidth}px !important;
          max-height: ${columnHeight}px !important;
        }
        table {
          max-width: ${columnWidth}px !important;
        }
        td {
          max-width: ${columnWidth}px;
        }
      `)
    }
  })

  // @todo fix the panstart issue
  // @todo maybe increasing the hammer distance before triggering pan as well
  // reader.registerHook(`item.onLoad`, ({frame}) => {
  //   frame.contentDocument?.body.addEventListener(`contextmenu`, e => {
  //     console.log(`ad`)
  //     e.preventDefault()
  //   })
  // })

  let observer: ResizeObserver | undefined

  if (options.layoutAutoResize === `container`) {
    observer = new ResizeObserver(() => {
      reader?.layout()
    })
    observer.observe(options.containerElement)
  }

  const movingSafePan$ = createMovingSafePan$(reader)

  movingSafePan$.subscribe()

  settingsSubject$
    .pipe(
      mapKeysTo([`pageHorizontalMargin`, `pageVerticalMargin`]),
      distinctUntilChanged(isShallowEqual),
      skip(1),
      tap(() => {
        reader.spine.layout()
      }),
      takeUntil(reader.$.destroy$)
    )
    .subscribe()

  return {
    ...reader,
    destroy: () => {
      reader.destroy()
      observer?.disconnect()
    },
    setSettings: ({ pageVerticalMargin, pageHorizontalMargin, ...rest }) => {
      if (pageHorizontalMargin !== undefined || pageVerticalMargin !== undefined) {
        settingsSubject$.next({
          pageHorizontalMargin: pageHorizontalMargin ?? settingsSubject$.value.pageHorizontalMargin,
          pageVerticalMargin: pageVerticalMargin ?? settingsSubject$.value.pageVerticalMargin
        })
      }

      reader.setSettings(rest)
    },
    $: {
      ...reader.$,
      settings$: combineLatest([reader.$.settings$, settingsSubject$.asObservable()])
        .pipe(
          map(([innerSettings, settings]) => ({
            ...innerSettings,
            ...settings
          }))
        )
    }
  }
}

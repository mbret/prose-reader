/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  distinctUntilChanged,
  takeUntil,
  tap,
  skip,
  filter,
  switchMap,
  debounceTime,
} from "rxjs/operators"
import { createMovingSafePan$ } from "./createMovingSafePan$"
import { mapKeysTo } from "../../utils/rxjs"
import { isShallowEqual } from "../../utils/objects"
import { fixReflowable } from "./fixReflowable"
import {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { isDefined } from "../../utils/isDefined"
import { SettingsInterface } from "../../settings/SettingsInterface"
import { SettingsManager } from "./SettingsManager"
import { InputSettings, OutputSettings } from "./types"
import { merge, Observable } from "rxjs"

export const layoutEnhancer =
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
        OutputSettings & InheritComputedSettings
      >
    },
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions & Partial<InputSettings>): Output => {
    const { pageHorizontalMargin, pageVerticalMargin, layoutAutoResize } =
      options
    const reader = next(options)

    const settingsManager = new SettingsManager<
      InheritSettings,
      InheritComputedSettings
    >(
      {
        pageHorizontalMargin,
        pageVerticalMargin,
        layoutAutoResize,
      },
      reader.settings as SettingsInterface<
        InheritSettings,
        InheritComputedSettings
      >,
    )

    reader.hookManager.register(`onViewportOffsetAdjust`, () => {
      let hasRedrawn = false

      /**
       * When adjusting the offset, there is a chance that pointer event being dispatched right after
       * have a wrong `clientX` / `pageX` etc. This is because even if the iframe
       * left value (once requested) is correct,
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
      reader.spineItemsManager.items.forEach((item) => {
        const frame = item.frame.element

        if (!hasRedrawn && frame) {
          /* eslint-disable-next-line no-void */
          void frame.getBoundingClientRect().left
          hasRedrawn = true
        }
      })
    })

    /**
     * Apply margins to frame item
     * @todo memoize
     */
    reader.hookManager.register(
      `item.onLayoutBeforeMeasurement`,
      ({ itemIndex, minimumWidth, isImageType }) => {
        const item = reader.spineItemsManager.get(itemIndex)
        const frame = item?.frame
        const { pageHorizontalMargin = 0, pageVerticalMargin = 0 } =
          settingsManager.values
        const pageSize = reader.context.getPageSize()

        if (
          item?.item.renditionLayout === `reflowable` &&
          frame?.isReady &&
          !isImageType() &&
          !frame.getViewportDimensions()
        ) {
          let columnWidth = pageSize.width - pageHorizontalMargin * 2
          const columnHeight = pageSize.height - pageVerticalMargin * 2
          let width = pageSize.width - pageHorizontalMargin * 2
          let columnGap = pageHorizontalMargin * 2

          if (frame.isUsingVerticalWriting()) {
            width = minimumWidth - pageHorizontalMargin * 2
            columnWidth = columnHeight
            columnGap = pageVerticalMargin * 2
          }

          frame?.removeStyle(`prose-layout-enhancer-css`)
          frame?.addStyle(
            `prose-layout-enhancer-css`,
            `
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
        `,
          )
        }
      },
    )

    fixReflowable(reader)

    // @todo fix the panstart issue
    // @todo maybe increasing the hammer distance before triggering pan as well
    // reader.registerHook(`item.onLoad`, ({frame}) => {
    //   frame.contentDocument?.body.addEventListener(`contextmenu`, e => {
    //     e.preventDefault()
    //   })
    // })

    const observeContainerResize = (container: HTMLElement) =>
      new Observable((observer) => {
        const resizeObserver = new ResizeObserver(() => {
          observer.next()
        })

        resizeObserver.observe(container)

        return () => {
          resizeObserver.disconnect()
        }
      })

    const layoutOnContainerResize$ = settingsManager.values$.pipe(
      filter(({ layoutAutoResize }) => layoutAutoResize === "container"),
      switchMap(() => reader.context.containerElement$),
      filter(isDefined),
      switchMap((container) => observeContainerResize(container)),
      debounceTime(100),
      tap(() => {
        reader?.layout()
      }),
    )

    const movingSafePan$ = createMovingSafePan$(reader)

    movingSafePan$.subscribe()

    settingsManager.values$
      .pipe(
        mapKeysTo([`pageHorizontalMargin`, `pageVerticalMargin`]),
        distinctUntilChanged(isShallowEqual),
        skip(1),
        tap(() => {
          reader.layout()
        }),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    merge(layoutOnContainerResize$)
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return {
      ...reader,
      destroy: () => {
        settingsManager.destroy()
        reader.destroy()
      },
      settings: settingsManager,
    } as unknown as Output
  }

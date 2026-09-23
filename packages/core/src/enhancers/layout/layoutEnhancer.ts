import { detectMimeTypeFromName } from "@prose-reader/shared"
import { merge, type Observable, type ObservedValueOf, of } from "rxjs"
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  share,
  shareReplay,
  skip,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators"
import type { SettingsInterface } from "../../settings/SettingsInterface"
import type { Pages } from "../../spine/Pages"
import {
  setAttributeIfChanged,
  setStylePropertyIfChanged,
} from "../../utils/dom"
import { upsertCSSToFrame } from "../../utils/frames"
import { isDefined } from "../../utils/isDefined"
import { observeResize } from "../../utils/rxjs"
import type { themeEnhancer } from "../theme"
import type {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { createCoordinatesApi } from "./coordinates"
import { createMovingSafePan$ } from "./createMovingSafePan$"
import { createPlaceholderPages } from "./createPlaceholderPages"
import { fixIframeScrollbar } from "./fixIframeScrollbar"
import { fixReflowable } from "./fixReflowable"
import { flagSpineItems } from "./flagSpineItems"
import { SettingsManager } from "./SettingsManager"
import type { EnhancerLayoutInputSettings, OutputSettings } from "./types"
import { updateSpreadMode } from "./updateSpreadMode"

export type LayoutEnhancerOutput = {
  layout$: Observable<ObservedValueOf<Pages>>
  layoutInfo$: Observable<ObservedValueOf<Pages>>
  /**
   * True from the moment the container reports a new size until the reader
   * has started a layout for it, which measures the viewport at that size, or
   * found it has nothing to lay out. The items are laid out after that, and
   * pagination settles once they are. Always false while `layoutAutoResize`
   * is off.
   */
  isContainerResizePending$: Observable<boolean>
  coordinates: ReturnType<typeof createCoordinatesApi>
}

export const layoutEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<typeof themeEnhancer>,
    InheritSettings extends NonNullable<
      InheritOutput["settings"]["_inputSettings"]
    >,
    InheritComputedSettings extends NonNullable<
      InheritOutput["settings"]["_outputSettings"]
    >,
    Output extends Omit<InheritOutput, "settings"> &
      LayoutEnhancerOutput & {
        settings: SettingsInterface<
          InheritSettings & EnhancerLayoutInputSettings,
          OutputSettings & InheritComputedSettings
        >
      },
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions & Partial<EnhancerLayoutInputSettings>): Output => {
    const {
      pageHorizontalMargin,
      pageVerticalMargin,
      layoutAutoResize,
      layoutLayerTransition,
    } = options
    const reader = next(options)

    const settingsManager = new SettingsManager<
      InheritSettings,
      InheritComputedSettings
    >(
      {
        pageHorizontalMargin,
        pageVerticalMargin,
        layoutAutoResize,
        layoutLayerTransition,
      },
      reader.settings as SettingsInterface<
        InheritSettings,
        InheritComputedSettings
      >,
    )

    reader.hookManager.register(`onViewportOffsetAdjust`, () => {
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
      for (const item of reader.spineItemsManager.items) {
        const frame = item.renderer.getDocumentFrame()

        if (frame) {
          void frame.getBoundingClientRect().left
          break
        }
      }
    })

    /**
     * @todo move to theming
     */
    reader.hookManager.register(`item.onBeforeLayout`, ({ item }) => {
      const spineItem = reader.spineItemsManager.get(item.id)
      const mimeType = item.mediaType ?? detectMimeTypeFromName(item.href)
      const isImageType = !!mimeType?.startsWith(`image/`)

      const { pageHorizontalMargin = 0, pageVerticalMargin = 0 } =
        settingsManager.values
      const pageSize = reader.viewport.pageSize

      if (spineItem?.renditionLayout === `reflowable` && !isImageType) {
        let columnWidth = pageSize.width - pageHorizontalMargin * 2
        const columnHeight = pageSize.height - pageVerticalMargin * 2
        let width = pageSize.width - pageHorizontalMargin * 2
        let columnGap = pageHorizontalMargin * 2

        if (spineItem.isUsingVerticalWriting()) {
          width = pageSize.width - pageHorizontalMargin * 2
          columnWidth = columnHeight
          columnGap = pageVerticalMargin * 2
        }

        const frame = spineItem?.renderer.getDocumentFrame()

        if (frame) {
          upsertCSSToFrame(
            frame,
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
                -max-width: ${columnWidth}px !important;
                -max-height: ${columnHeight}px !important;
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
      }
    })

    fixReflowable(reader)
    fixIframeScrollbar(reader)

    reader.hookManager.register(
      `item.onDocumentCreated`,
      ({ documentContainer }) => {
        /**
         * Hide document until it's ready
         */
        setStylePropertyIfChanged(documentContainer.style, `opacity`, `0`)
        if (settingsManager.values.layoutLayerTransition) {
          setStylePropertyIfChanged(
            documentContainer.style,
            `transition`,
            `opacity 800ms`,
          )
        }
      },
    )

    reader.hookManager.register(`item.onBeforeLayout`, ({ item }) => {
      const spineItem = reader.spineItemsManager.get(item.id)

      const element = spineItem?.renderer.documentContainer

      // @todo dont remember why i did this but there should be a reason. If i get time to explain
      if (reader.settings.values.computedPageTurnMode !== `scrollable`) {
        // @todo see what's the impact
        if (element) {
          setAttributeIfChanged(element, `tab-index`, `0`)
        }
      }
    })

    const revealItemOnReady$ = reader.spineItemsObserver.itemStateChange$.pipe(
      filter(({ isReady }) => isReady),
      tap(({ item }) => {
        const element = item.renderer.documentContainer

        if (element) {
          setStylePropertyIfChanged(element.style, `opacity`, `1`)
        }
      }),
    )

    // @todo fix the pan-start issue
    // @todo maybe increasing the hammer distance before triggering pan as well
    // reader.registerHook(`item.onDocumentLoad`, ({frame}) => {
    //   frame.contentDocument?.body.addEventListener(`contextmenu`, e => {
    //     e.preventDefault()
    //   })
    // })

    /**
     * Whether the container has reported a size the reader has not handled
     * yet. A report waits until the container has held its size for a moment,
     * then either starts a layout or, when the viewport is still the size it
     * was laid out at, is dropped. Laying out and this state come from the
     * one observer, so neither can run ahead of the other.
     *
     * The observer lives as long as `layoutAutoResize` is on, not as long as
     * the settings object: a new observer reports the size it starts with,
     * which would lay out again at the same size.
     */
    const isContainerResizePending$ = settingsManager
      .watch("layoutAutoResize")
      .pipe(
        switchMap((layoutAutoResize) =>
          layoutAutoResize === "container"
            ? reader.context.watch(`rootElement`).pipe(
                filter(isDefined),
                switchMap((element) => {
                  const reported$ = observeResize(element).pipe(share())
                  const handled$ = reported$.pipe(
                    debounceTime(100),
                    tap(() => {
                      if (reader.viewport.hasResizedSinceLayout()) {
                        reader.layout()
                      }
                    }),
                  )

                  return merge(
                    reported$.pipe(map(() => true)),
                    handled$.pipe(map(() => false)),
                  )
                }),
                startWith(false),
              )
            : of(false),
        ),
        distinctUntilChanged(),
        takeUntil(reader.$.destroy$),
        shareReplay({ bufferSize: 1, refCount: true }),
      )

    const movingSafePan$ = createMovingSafePan$(reader)

    settingsManager
      .watch([`pageHorizontalMargin`, `pageVerticalMargin`])
      .pipe(
        skip(1),
        tap(() => {
          reader.layout()
        }),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    const layoutInfo$ = reader.spine.pages.pipe(
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    const flagSpineItems$ = flagSpineItems(reader)

    const updateSpreadMode$ = updateSpreadMode(reader)

    const placeholderPages$ = createPlaceholderPages(reader)

    merge(
      revealItemOnReady$,
      movingSafePan$,
      isContainerResizePending$,
      layoutInfo$,
      flagSpineItems$,
      updateSpreadMode$,
      placeholderPages$,
    )
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return {
      ...reader,
      destroy: () => {
        settingsManager.destroy()
        reader.destroy()
      },
      settings: settingsManager,
      layout$: reader.spine.layout$,
      layoutInfo$,
      isContainerResizePending$,
      coordinates: createCoordinatesApi(reader),
    } as unknown as Output
  }

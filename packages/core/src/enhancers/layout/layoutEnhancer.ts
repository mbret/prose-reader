import { detectMimeTypeFromName } from "@prose-reader/shared"
import { merge, type Observable, type ObservedValueOf } from "rxjs"
import {
  debounceTime,
  filter,
  shareReplay,
  skip,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators"
import type { SettingsInterface } from "../../settings/SettingsInterface"
import type { Pages } from "../../spine/Pages"
import { upsertCSSToFrame } from "../../utils/frames"
import { isDefined } from "../../utils/isDefined"
import { observeResize } from "../../utils/rxjs"
import type {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { createCoordinatesApi } from "./coordinates"
import { createMovingSafePan$ } from "./createMovingSafePan$"
import { fixReflowable } from "./fixReflowable"
import { flagSpineItems } from "./flagSpineItems"
import { SettingsManager } from "./SettingsManager"
import type { EnhancerLayoutInputSettings, OutputSettings } from "./types"
import { createViewportModeHandler } from "./viewportMode"

export type LayoutEnhancerOutput = {
  layout$: Observable<ObservedValueOf<Pages>>
  layoutInfo$: Observable<ObservedValueOf<Pages>>
  coordinates: ReturnType<typeof createCoordinatesApi>
}

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
      viewportMode,
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
        viewportMode,
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
        const frame = item.renderer.getDocumentFrame()

        if (!hasRedrawn && frame) {
          void frame.getBoundingClientRect().left
          hasRedrawn = true
        }
      })
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
      const pageSize = reader.context.getPageSize()

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

    reader.hookManager.register(
      `item.onDocumentCreated`,
      ({ documentContainer }) => {
        /**
         * Hide document until it's ready
         */
        documentContainer.style.opacity = `0`
        if (settingsManager.values.layoutLayerTransition) {
          documentContainer.style.transition = `opacity 300ms`
        }
      },
    )

    reader.hookManager.register(`item.onBeforeLayout`, ({ item }) => {
      const spineItem = reader.spineItemsManager.get(item.id)

      const element = spineItem?.renderer.documentContainer

      // @todo dont remember why i did this but there should be a reason. If i get time to explain
      if (reader.settings.values.computedPageTurnMode !== `scrollable`) {
        // @todo see what's the impact
        element?.setAttribute(`tab-index`, `0`)
      }
    })

    const revealItemOnReady$ = reader.spineItemsObserver.itemIsReady$.pipe(
      filter(({ isReady }) => isReady),
      tap(({ item }) => {
        const element = item.renderer.documentContainer

        if (element) {
          element.style.opacity = `1`
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

    const layoutOnContainerResize$ = settingsManager.values$.pipe(
      filter(({ layoutAutoResize }) => layoutAutoResize === "container"),
      switchMap(() => reader.context.watch(`rootElement`)),
      filter(isDefined),
      switchMap((element) => observeResize(element)),
      debounceTime(100),
      filter(isDefined),
      tap(() => {
        reader?.layout()
      }),
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

    /**
     * Apply some extra classes to spine item to help debugging,
     * styling, testing, etc.
     */
    const updateSpineItemClassName$ =
      reader.spineItemsObserver.itemIsReady$.pipe(
        tap(({ item, isReady }) => {
          const className = `prose-spineItem-ready`

          if (isReady) {
            item.containerElement.classList.add(className)
          } else {
            item.containerElement.classList.remove(className)
          }
        }),
      )

    const viewportModeHandler$ = createViewportModeHandler(
      reader,
      settingsManager.watch(`viewportMode`),
    )

    const layoutInfo$ = reader.spine.pages.pipe(
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    const flagSpineItems$ = flagSpineItems(reader)

    merge(
      updateSpineItemClassName$,
      revealItemOnReady$,
      movingSafePan$,
      layoutOnContainerResize$,
      viewportModeHandler$,
      layoutInfo$,
      flagSpineItems$,
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
      coordinates: createCoordinatesApi(reader),
    } as unknown as Output
  }

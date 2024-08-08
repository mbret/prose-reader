import { merge, Subject } from "rxjs"
import { Manifest } from "../.."
import { Context } from "../../context/Context"
import { getAttributeValueFromString } from "../../frames"
import { map } from "rxjs/operators"
import { createLoader } from "./loader"
import { createFrameManipulator } from "./createFrameManipulator"
import { createHtmlPageFromResource } from "./createHtmlPageFromResource"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { HookManager } from "../../hooks/HookManager"

export const createFrameItem = ({
  item,
  parent,
  context,
  settings,
  hookManager,
}: {
  parent: HTMLElement
  item: Manifest[`spineItems`][number]
  context: Context
  settings: ReaderSettingsManager
  hookManager: HookManager
}) => {
  const destroySubject$ = new Subject<void>()

  const {
    $: {
      unload$,
      loaded$,
      isLoaded$,
      isReady$,
      unloaded$,
      frameElement$,
      ready$,
    },
    load,
    unload,
    destroy: loaderDestroy,
    getComputedStyleAfterLoad,
  } = createLoader({
    context,
    hookManager,
    item,
    parent,
    settings,
  })

  /**
   * @deprecated
   */
  let isLoadedSync = false
  /**
   * @deprecated
   */
  let isReadySync = false

  isLoaded$.subscribe({
    next: (value) => {
      isLoadedSync = value
    },
  })
  isReady$.subscribe({
    next: (value) => {
      isReadySync = value
    },
  })

  // @todo redo
  const getManipulableFrame = ():
    | ReturnType<typeof createFrameManipulator>
    | undefined => {
    const frame = frameElement$.value
    if (isLoadedSync && frame) {
      return createFrameManipulator(frame)
    }
  }

  // @todo memoize
  const getViewportDimensions = () => {
    const frame = frameElement$.getValue()

    if (frame && frame?.contentDocument) {
      const doc = frame.contentDocument
      const viewPortMeta = doc.querySelector(`meta[name='viewport']`)
      if (viewPortMeta) {
        const viewPortMetaInfos = viewPortMeta.getAttribute(`content`)
        if (viewPortMetaInfos) {
          const width = getAttributeValueFromString(viewPortMetaInfos, `width`)
          const height = getAttributeValueFromString(
            viewPortMetaInfos,
            `height`,
          )
          if (width > 0 && height > 0) {
            return {
              width: width,
              height: height,
            }
          } else {
            return undefined
          }
        }
      }
    }

    return undefined
  }

  const getWritingMode = () => {
    return getComputedStyleAfterLoad()?.writingMode as
      | `vertical-rl`
      | `horizontal-tb`
      | undefined
  }

  const isUsingVerticalWriting = () => {
    return !!getWritingMode()?.startsWith(`vertical`)
  }

  const getHtmlFromResource = (response: Response) => {
    return createHtmlPageFromResource(response, item)
  }

  const contentLayoutChange$ = merge(
    unloaded$.pipe(map(() => ({ isFirstLayout: false }))),
    ready$.pipe(map(() => ({ isFirstLayout: true }))),
  )

  const destroy = () => {
    unload()
    loaderDestroy()
    destroySubject$.next()
    destroySubject$.complete()
  }

  return {
    /**
     * @deprecated
     */
    getIsLoaded: () => isLoadedSync,
    /**
     * @deprecated
     */
    getIsReady: () => isReadySync,
    getViewportDimensions,
    getFrameElement: () => frameElement$.getValue(),
    getHtmlFromResource,
    load,
    unload,
    /**
     * Upward layout is used when the parent wants to manipulate the iframe without triggering
     * `layout` event. This is a particular case needed for iframe because the parent can layout following
     * an iframe `layout` event. Because the parent `layout` may change some of iframe properties we do not
     * want the iframe to trigger a new `layout` even and have infinite loop.
     */
    staticLayout: (size: { width: number; height: number }) => {
      const frame = frameElement$.getValue()
      if (frame) {
        frame.style.width = `${size.width}px`
        frame.style.height = `${size.height}px`

        if (settings.settings.computedPageTurnMode !== `scrollable`) {
          // @todo see what's the impact
          frame.setAttribute(`tab-index`, `0`)
        }
      }
    },
    // @todo block access, only public API to manipulate / get information (in order to memo / optimize)
    // manipulate() with cb and return boolean whether re-layout or not
    getManipulableFrame,
    getReadingDirection: (): `ltr` | `rtl` | undefined => {
      const writingMode = getWritingMode()
      if (writingMode === `vertical-rl`) {
        return `rtl`
      }

      const direction = getComputedStyleAfterLoad()?.direction
      if ([`ltr`, `rtl`].includes(direction || ``))
        return direction as `ltr` | `rtl`

      return undefined
    },
    isUsingVerticalWriting,
    getWritingMode,
    destroy,
    $: {
      unload$: unload$,
      unloaded$: unloaded$,
      loaded$,
      ready$,
      isReady$,
      /**
       * This is used as upstream layout change. This event is being listened to by upper app
       * in order to layout again and adjust every element based on the new content.
       */
      contentLayoutChange$,
    },
  }
}

export type SpineItemFrame = ReturnType<typeof createFrameItem>

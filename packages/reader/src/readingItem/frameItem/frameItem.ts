import { BehaviorSubject, merge, Observable, Subject } from "rxjs"
import { Manifest } from "../../types"
import { Context } from "../../context"
import { getAttributeValueFromString } from "../../frames"
import { Hook } from "../../types/Hook"
import { distinctUntilChanged, map } from "rxjs/operators"
import { createLoader } from "./loader"
import { createFrameManipulator } from "./createFrameManipulator"
import { createHtmlPageFromResource } from "./createHtmlPageFromResource"

export type ReadingItemFrame = ReturnType<typeof createFrameItem>

export const createFrameItem = ({ item, parent, fetchResource, context, hooks$ }: {
  parent: HTMLElement,
  item: Manifest['readingOrder'][number],
  context: Context,
  fetchResource?: (item: Manifest['readingOrder'][number]) => Promise<Response>,
  hooks$: Observable<Hook[]>
}) => {
  const destroySubject$ = new Subject<void>()
  const stateSubject$ = new BehaviorSubject({
    isReady: false,
    isLoading: false,
    frameLoaded: false
  })

  const {
    unload$,
    loaded$,
    unloaded$,
    load,
    unload,
    destroy: loaderDestroy,
    getComputedStyleAfterLoad,
    frameElement$
  } = createLoader({ context, hooks$, item, parent, stateSubject$, fetchResource, })

  const getManipulableFrame = () => {
    const frame = frameElement$.getValue()
    if (stateSubject$.getValue().frameLoaded && frame) {
      return createFrameManipulator(frame)
    }
  }

  const getViewportDimensions = () => {
    const frame = frameElement$.getValue()

    if (frame && frame?.contentDocument) {
      const doc = frame.contentDocument
      const viewPortMeta = doc.querySelector("meta[name='viewport']")
      if (viewPortMeta) {
        const viewPortMetaInfos = viewPortMeta.getAttribute('content')
        if (viewPortMetaInfos) {
          const width = getAttributeValueFromString(viewPortMetaInfos, 'width')
          const height = getAttributeValueFromString(viewPortMetaInfos, 'height')
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
    return getComputedStyleAfterLoad()?.writingMode as 'vertical-rl' | 'horizontal-tb' | undefined
  }

  const isUsingVerticalWriting = () => {
    return !!getWritingMode()?.startsWith(`vertical`)
  }

  const getHtmlFromResource = (response: Response) => {
    return createHtmlPageFromResource(response, item)
  }

  const contentLayoutChange$ = merge(
    unloaded$
      .pipe(
        map(() => ({ isFirstLayout: false }))
      ),
    loaded$
      .pipe(
        map(() => ({ isFirstLayout: true }))
      )
  )

  return {
    getIsLoaded: () => stateSubject$.getValue().frameLoaded,
    getIsReady: () => stateSubject$.getValue().isReady,
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
    staticLayout: (size: { width: number, height: number }) => {
      const frame = frameElement$.getValue()
      if (frame) {
        frame.style.width = `${size.width}px`
        frame.style.height = `${size.height}px`

        if (context.getSettings().computedPageTurnMode !== `free`) {
          // @todo see what's the impact
          frame.setAttribute('tab-index', '0')
        }
      }
    },
    // @todo block access, only public API to manipulate / get information (in order to memo / optimize)
    // manipulate() with cb and return boolean whether re-layout or not
    getManipulableFrame,
    getReadingDirection: (): 'ltr' | 'rtl' | undefined => {
      const writingMode = getWritingMode()
      if (writingMode === `vertical-rl`) {
        return 'rtl'
      }

      const direction = getComputedStyleAfterLoad()?.direction
      if (['ltr', 'rtl'].includes(direction || ``)) return direction as ('ltr' | 'rtl')

      return undefined
    },
    isUsingVerticalWriting,
    getWritingMode,
    destroy: () => {
      unload()
      loaderDestroy()
      stateSubject$.complete()
      destroySubject$.next()
      destroySubject$.complete()
    },
    $: {
      unload$: unload$,
      unloaded$: unloaded$,
      isLoading$: stateSubject$.asObservable()
        .pipe(
          map(({ isLoading }) => isLoading),
          distinctUntilChanged()
        ),
      isReady$: stateSubject$.asObservable()
        .pipe(
          map(({ isReady }) => isReady),
          distinctUntilChanged()
        ),
      /**
       * This is used as upstream layout change. This event is being listened to by upper app
       * in order to layout again and adjust every element based on the new content.
       */
      contentLayoutChange$
    },
  }
}
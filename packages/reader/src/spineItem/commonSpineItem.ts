import { Context } from "../context"
import { createFrameItem, SpineItemFrame } from "./frameItem/frameItem"
import { Manifest } from "../types"
import { BehaviorSubject, Observable, Subject } from "rxjs"
import { createFingerTracker, createSelectionTracker } from "./trackers"
import { isMouseEvent, isPointerEvent } from "../utils/dom"
import { attachOriginalFrameEventToDocumentEvent } from "../frames"
import { Hook } from "../types/Hook"
import { map, takeUntil, tap, withLatestFrom } from "rxjs/operators"
import { createFrameManipulator } from "./frameItem/createFrameManipulator"

const pointerEvents = [
  `pointercancel` as const,
  `pointerdown` as const,
  `pointerenter` as const,
  `pointerleave` as const,
  `pointermove` as const,
  `pointerout` as const,
  `pointerover` as const,
  `pointerup` as const
]

const mouseEvents = [
  `mousedown` as const,
  `mouseup` as const,
  `mouseenter` as const,
  `mouseleave` as const,
  `mousemove` as const,
  `mouseout` as const,
  `mouseover` as const
]

const passthroughEvents = [...pointerEvents, ...mouseEvents]

export const createCommonSpineItem = ({ item, context, parentElement, iframeEventBridgeElement, hooks$, viewportState$ }: {
  item: Manifest[`spineItems`][number],
  parentElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
  hooks$: BehaviorSubject<Hook[]>,
  viewportState$: Observable<`free` | `busy`>
}) => {
  const destroySubject$ = new Subject<void>()
  const isReflowable = false
  const contentLayoutChangeSubject$ = new Subject<{ isFirstLayout: boolean, isReady: boolean }>()
  const containerElement = createContainerElement(parentElement, item, hooks$)
  const loadingElement = createLoadingElement(parentElement, item, context)
  const overlayElement = createOverlayElement(parentElement, item)
  const fingerTracker = createFingerTracker()
  const selectionTracker = createSelectionTracker()
  const frameHooks = createFrameHooks(iframeEventBridgeElement, fingerTracker, selectionTracker)
  const spineItemFrame = createFrameItem({
    parent: containerElement,
    item,
    context,
    fetchResource: context.getLoadOptions()?.fetchResource,
    hooks$: hooks$.asObservable()
      .pipe(
        map(hooks => [...hooks, ...frameHooks])
      ),
    viewportState$
  })
  // let layoutInformation: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number } = { blankPagePosition: `none`, minimumWidth: context.getPageSize().width }

  containerElement.appendChild(loadingElement)
  containerElement.appendChild(overlayElement)
  parentElement.appendChild(containerElement)

  // Do not memoize x,y,top,left as they change relatively to the viewport all the time
  let memoizedElementDimensions: { width: number, height: number } | undefined

  const getElementDimensions = () => {
    if (memoizedElementDimensions) {
      return memoizedElementDimensions
    }

    const rect = containerElement.getBoundingClientRect()
    const normalizedValues = {
      ...rect,
      // we want to round to first decimal because it's possible to have half pixel
      // however browser engine can also gives back x.yyyy based on their precision
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10
    }

    memoizedElementDimensions = normalizedValues

    return memoizedElementDimensions
  }

  const injectStyle = (spineItemFrame: SpineItemFrame, cssText: string) => {
    spineItemFrame.getManipulableFrame()?.removeStyle(`prose-reader-css`)
    spineItemFrame.getManipulableFrame()?.addStyle(`prose-reader-css`, cssText)
  }

  const adjustPositionOfElement = ({ right, left, top }: { right?: number, left?: number, top?: number }) => {
    if (right !== undefined) {
      containerElement.style.right = `${right}px`
    } else {
      containerElement.style.removeProperty(`right`)
    }
    if (left !== undefined) {
      containerElement.style.left = `${left}px`
    } else {
      containerElement.style.removeProperty(`left`)
    }
    if (top !== undefined) {
      containerElement.style.top = `${top}px`
    } else {
      containerElement.style.removeProperty(`top`)
    }
  }

  const getViewPortInformation = () => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    const viewportDimensions = spineItemFrame.getViewportDimensions()
    const frameElement = spineItemFrame.getManipulableFrame()?.frame
    if (containerElement && frameElement?.contentDocument && frameElement?.contentWindow && viewportDimensions) {
      const computedWidthScale = pageWidth / viewportDimensions.width
      const computedScale = Math.min(computedWidthScale, pageHeight / viewportDimensions.height)

      return { computedScale, computedWidthScale, viewportDimensions }
    }

    return { computedScale: 1, computedWidthScale: 1, ...viewportDimensions }
  }

  const loadContent = () => spineItemFrame.load()

  const unloadContent = () => spineItemFrame.unload()

  const getBoundingRectOfElementFromSelector = (selector: string) => {
    const frame = spineItemFrame.getManipulableFrame()?.frame
    if (frame && selector) {
      if (selector.startsWith(`#`)) {
        return frame.contentDocument?.getElementById(selector.replace(`#`, ``))?.getBoundingClientRect()
      }
      return frame.contentDocument?.querySelector(selector)?.getBoundingClientRect()
    }
  }

  const setLayoutDirty = () => {
    memoizedElementDimensions = undefined
  }

  // const layout = ({ height, width, ...newLayoutInformation }: { height: number, width: number } & typeof layoutInformation) => {
  const layout = ({ height, width }: { height: number, width: number }) => {
    containerElement.style.width = `${width}px`
    containerElement.style.height = `${height}px`

    loadingElement.style.setProperty(`max-width`, `${context.getVisibleAreaRect().width}px`)

    // layoutInformation = newLayoutInformation

    setLayoutDirty()

    hooks$.getValue().forEach(hook => {
      if (hook.name === `item.onLayout`) {
        hook.fn({ frame: spineItemFrame.getFrameElement(), container: containerElement, loadingElement, item, overlayElement })
      }
    })
  }

  const translateFramePositionIntoPage = (position: { clientX: number, clientY: number }) => {
    // Here we use getBoundingClientRect meaning we will get relative value for left / top based on current
    // window (viewport). This is handy because we can easily get the translated x/y without any extra information
    // such as page index, etc. However this might be a bit less performance to request heavily getBoundingClientRect
    const { left = 0, top = 0 } = spineItemFrame.getFrameElement()?.getBoundingClientRect() || {}
    const { computedScale = 1 } = getViewPortInformation() || {}
    const adjustedX = position.clientX * computedScale + left
    const adjustedY = position.clientY * computedScale + top

    return {
      clientX: adjustedX,
      clientY: adjustedY
    }
  }

  const getResource = async () => {
    const loadOptions = context.getLoadOptions()
    const lastFetch = (_: Manifest[`spineItems`][number]) => {
      if (loadOptions?.fetchResource) {
        return loadOptions.fetchResource(item)
      }

      return fetch(item.href)
    }

    const finalFetch = hooks$.getValue().reduce((acc, hook) => {
      if (hook.name === `item.onGetResource`) {
        return hook.fn(acc)
      }

      return acc
    }, lastFetch)

    return await finalFetch(item)
  }

  const manipulateSpineItem = (
    cb: (options: {
      container: HTMLElement,
      loadingElement: HTMLElement,
      item: Manifest[`spineItems`][number],
      overlayElement: HTMLDivElement,
    } & (ReturnType<typeof createFrameManipulator> | { frame: undefined, removeStyle: (id: string) => void, addStyle: (id: string, style: string) => void })) => boolean
  ) => {
    const manipulableFrame = spineItemFrame.getManipulableFrame()

    if (manipulableFrame) return cb({ ...manipulableFrame, container: containerElement, loadingElement, item, overlayElement })

    return cb({ container: containerElement, loadingElement, item, frame: undefined, removeStyle: () => { }, addStyle: () => { }, overlayElement })
  }

  spineItemFrame.$.contentLayoutChange$
    .pipe(
      withLatestFrom(spineItemFrame.$.isReady$),
      takeUntil(destroySubject$)
    )
    .subscribe(([data, isReady]) => {
      if (data.isFirstLayout && isReady) {
        loadingElement.style.visibility = `hidden`
      }
      contentLayoutChangeSubject$.next({ isFirstLayout: data.isFirstLayout, isReady })
    })

  spineItemFrame.$.unload$
    .pipe(
      tap(() => {
        if (loadingElement && loadingElement.style.visibility !== `visible`) {
          loadingElement.style.visibility = `visible`
        }
      }),
      takeUntil(destroySubject$)
    )
    .subscribe()

  return {
    load: () => {
      setLayoutDirty()
    },
    layout,
    adjustPositionOfElement,
    createLoadingElement,
    getElementDimensions,
    getHtmlFromResource: spineItemFrame.getHtmlFromResource,
    getResource,
    translateFramePositionIntoPage,
    setLayoutDirty,
    injectStyle,
    loadContent,
    unloadContent,
    spineItemFrame,
    element: containerElement,
    loadingElement,
    isReflowable,
    getBoundingRectOfElementFromSelector,
    getViewPortInformation,
    isReady: spineItemFrame.getIsReady,
    destroy: () => {
      destroySubject$.next()
      loadingElement.onload = () => { }
      loadingElement.remove()
      containerElement.remove()
      spineItemFrame?.destroy()
      fingerTracker.destroy()
      selectionTracker.destroy()
      destroySubject$.complete()
    },
    isUsingVerticalWriting: () => spineItemFrame.getWritingMode()?.startsWith(`vertical`),
    getReadingDirection: () => {
      return spineItemFrame.getReadingDirection() || context.getReadingDirection()
    },
    manipulateSpineItem,
    selectionTracker,
    fingerTracker,
    $: {
      contentLayoutChangeSubject$: contentLayoutChangeSubject$.asObservable(),
      loaded$: spineItemFrame.$.loaded$
    }
  }
}

const createContainerElement = (containerElement: HTMLElement, item: Manifest[`spineItems`][number], hooks$: BehaviorSubject<Hook[]>) => {
  const element: HTMLElement = containerElement.ownerDocument.createElement(`div`)
  element.classList.add(`spineItem`)
  element.classList.add(`spineItem-${item.renditionLayout}`)
  element.style.cssText = `
    position: absolute;
    overflow: hidden;
  `

  return hooks$.getValue().reduce((element, hook) => {
    if (hook.name === `item.onBeforeContainerCreated`) {
      return hook.fn(element)
    }

    return element
  }, element)
}

/**
 * We use iframe for loading element mainly to be able to use share hooks / manipulation
 * with iframe. That way the loading element always match whatever style is applied to iframe.
 */
const createLoadingElement = (containerElement: HTMLElement, item: Manifest[`spineItems`][number], context: Context) => {
  const loadingElement = containerElement.ownerDocument.createElement(`div`)
  loadingElement.classList.add(`loading`)
  loadingElement.style.cssText = `
    height: 100%;
    width: 100%;
    max-width: ${context.getVisibleAreaRect().width}px;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: absolute;
    left: 0;
    top: 0;
    background-color: white;
  `

  const logoElement = containerElement.ownerDocument.createElement(`div`)
  logoElement.innerText = `prose`
  logoElement.style.cssText = `
    font-size: 4em;
    color: #cacaca;
  `
  const detailsElement = containerElement.ownerDocument.createElement(`div`)
  detailsElement.innerText = `loading ${item.id}`
  detailsElement.style.cssText = `
    font-size: 1.2em;
    color: rgb(202, 202, 202);
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    max-width: 300px;
    width: 80%;
  `
  loadingElement.appendChild(logoElement)
  loadingElement.appendChild(detailsElement)

  return loadingElement
}

const createOverlayElement = (containerElement: HTMLElement, item: Manifest[`spineItems`][number]) => {
  const element = containerElement.ownerDocument.createElement(`div`)
  element.classList.add(`spineItemOverlay`)
  element.classList.add(`spineItemOverlay-${item.renditionLayout}`)
  element.style.cssText = `
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background-color: transparent;
  `

  return element
}

const createFrameHooks = (iframeEventBridgeElement: HTMLElement, fingerTracker: ReturnType<typeof createFingerTracker>, selectionTracker: ReturnType<typeof createSelectionTracker>): Hook[] => {
  return [
    {
      name: `item.onLoad`,
      fn: ({ frame }) => {
        /**
         * Register event listener for all mouse/pointer event in order to
         * passthrough events to main document
         */
        const unregister = passthroughEvents.map(event => {
          const listener = (e: MouseEvent | PointerEvent) => {
            let convertedEvent = e

            if (isPointerEvent(e)) {
              convertedEvent = new PointerEvent(e.type, e)
            }

            if (isMouseEvent(e)) {
              convertedEvent = new MouseEvent(e.type, e)
            }

            if (convertedEvent !== e) {
              attachOriginalFrameEventToDocumentEvent(convertedEvent, e)
              iframeEventBridgeElement.dispatchEvent(convertedEvent)
            }
          }

          frame.contentDocument?.addEventListener(event, listener)

          return () => {
            frame.contentDocument?.removeEventListener(event, listener)
          }
        })

        selectionTracker.track(frame)
        fingerTracker.track(frame)

        return () => {
          unregister.forEach(cb => cb())
        }
      }
    }
  ]
}

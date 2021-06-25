import { Subject } from "rxjs"
import { Report } from "../report"
import { Manifest } from "../types"
import { Context } from "../context"
import { createAddStyleHelper, createRemoveStyleHelper, getAttributeValueFromString } from "../frames"

export type ReadingItemFrame = ReturnType<typeof createReadingItemFrame>
type ManipulatableFrame = {
  frame: HTMLIFrameElement,
  removeStyle: (id: string) => void,
  addStyle: (id: string, style: CSSStyleDeclaration['cssText']) => void,
}
type Hook = { name: `onLoad`, fn: (manipulableFrame: ManipulatableFrame) => (() => void) | void }

type SubjectEvent =
  | { event: 'domReady', data: HTMLIFrameElement }
  /**
   * This is used as upstream layout change. This event is being listened to by upper app
   * in order to layout again and adjust every element based on the new content.
   */
  | { event: 'contentLayoutChange', data: { isFirstLayout: boolean, isReady: boolean } }

export const createReadingItemFrame = (
  parent: HTMLElement,
  item: Manifest['readingOrder'][number],
  context: Context,
) => {
  const subject = new Subject<SubjectEvent>()
  let isLoaded = false
  let currentLoadingId = 0
  let loading = false
  let frameElement: HTMLIFrameElement | undefined
  let isReady = false
  const src = item.href
  let hooks: Hook[] = []
  let hookDestroyFunctions: ReturnType<Hook['fn']>[] = []

  const getManipulableFrame = () => {
    if (isLoaded && frameElement) {
      return createFrameManipulator(frameElement)
    }
  }

  const getViewportDimensions = () => {
    if (frameElement && frameElement.contentDocument) {
      const doc = frameElement.contentDocument
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

  const unload = () => {
    if (loading || isReady) {
      isReady = false
      isLoaded = false
      loading = false
      hookDestroyFunctions.forEach(fn => fn && fn())
      frameElement?.remove()
      frameElement = undefined
      subject.next({ event: 'contentLayoutChange', data: { isFirstLayout: false, isReady: false } })
    }
  }

  const getWritingMode = () => {
    if (frameElement?.contentDocument && frameElement.contentDocument.body) {
      return frameElement?.contentWindow?.getComputedStyle(frameElement.contentDocument.body).writingMode as 'vertical-rl' | 'horizontal-tb' | undefined
    }
  }

  const isUsingVerticalWriting = () => {
    return !!getWritingMode()?.startsWith(`vertical`)
  }

  function registerHook(hook: Hook) {
    hooks.push(hook)
  }

  return {
    getIsReady: () => isReady,
    getIsLoaded: () => isLoaded,
    getIsLoading: () => loading,
    getViewportDimensions,
    getFrameElement: () => frameElement,
    load: Report.measurePerformance(`ReadingItemFrame load`, Infinity, async () => {
      if (loading || isReady) return
      loading = true
      const currentLoading = ++currentLoadingId
      const isCancelled = () => !(loading && currentLoading === currentLoadingId)

      frameElement = await createFrame(parent)

      const t0 = performance.now();

      const fetchResource = context.getLoadOptions()?.fetchResource
      if (!fetchResource || fetchResource === 'http') {
        // same domain url, we can serve it directly
        if (src.startsWith(window.location.origin)) {
          frameElement?.setAttribute(`src`, src)
        } else {
          // creating data url should circumvent cors
          const response = await fetch(src)
          frameElement?.setAttribute(`srcdoc`, await createHtmlPageFromResource(response))
        }
      } else {
        const response = await fetchResource(item)
        // @todo set base URI for xhtml/html content type
        frameElement?.setAttribute(`srcdoc`, await createHtmlPageFromResource(response))
      }

      return new Promise(async (resolve) => {
        if (frameElement && !isCancelled()) {
          frameElement.setAttribute('sandbox', 'allow-same-origin allow-scripts')
          frameElement.onload = () => {
            const t1 = performance.now();
            Report.metric({ name: `ReadingItemFrame load:onload`, duration: t1 - t0 });

            if (frameElement && !isCancelled()) {
              frameElement.onload = null
              frameElement.setAttribute('role', 'main')
              frameElement.setAttribute('tab-index', '0')

              isLoaded = true

              const manipulableFrame = getManipulableFrame()

              hookDestroyFunctions = hooks
                .filter(hook => hook.name === `onLoad`)
                .map(hook => manipulableFrame && hook.fn(manipulableFrame))

              // we conveniently wait for all the hooks so that the dom is correctly prepared
              // in addition to be ready.
              subject.next({ event: 'domReady', data: frameElement })

              frameElement.contentDocument?.fonts.ready.then(() => {
                if (frameElement && !isCancelled()) {
                  isReady = true
                  loading = false

                  // @todo hook onContentReady, dom is ready + first fonts are ready. we can assume is kind of already good enough

                  subject.next({ event: 'contentLayoutChange', data: { isFirstLayout: true, isReady: true } })
                }
              })

              resolve(true)
            }
          }
        }
      })
    }),
    unload,
    registerHook,
    /**
     * Upward layout is used when the parent wants to manipulate the iframe without triggering
     * `layout` event. This is a particular case needed for iframe because the parent can layout following
     * an iframe `layout` event. Because the parent `layout` may change some of iframe properties we do not
     * want the iframe to trigger a new `layout` even and have infinite loop.
     */
    staticLayout: (size: { width: number, height: number }) => {
      if (frameElement) {
        frameElement.style.width = `${size.width}px`
        frameElement.style.height = `${size.height}px`
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

      if (frameElement?.contentWindow && frameElement?.contentDocument?.body) {
        const direction = frameElement.contentWindow.getComputedStyle(frameElement.contentDocument.body).direction
        if (['ltr', 'rtl'].includes(direction)) return direction as ('ltr' | 'rtl')
      }
      return undefined
    },
    isUsingVerticalWriting,
    getWritingMode,
    destroy: () => {
      unload()
      hooks = []
    },
    $: subject,
  }
}

const createFrame = Report.measurePerformance(`ReadingItemFrame createFrame`, Infinity, async (container: HTMLElement) => {
  // we force undefined because otherwise the load method will believe it's defined after this call but the code is async and
  // the iframe could be undefined later
  return new Promise<HTMLIFrameElement | undefined>((resolve) => {
    const frame = document.createElement('iframe')
    frame.frameBorder = 'no'
    frame.tabIndex = 0
    frame.setAttribute('sandbox', 'allow-same-origin allow-scripts')
    frame.scrolling = 'no'
    frame.style.cssText = `
      visibility: hidden;
      overflow: hidden;
      background-color: transparent;
      border: 0px none transparent;
      padding: 0px;
      transition: opacity 300ms;
      opacity: 0;
    `
    container.appendChild(frame)

    resolve(frame)
  })
})

export const createFrameManipulator = (frameElement: HTMLIFrameElement) => ({
  frame: frameElement,
  removeStyle: createRemoveStyleHelper(frameElement),
  addStyle: createAddStyleHelper(frameElement)
})

const createHtmlPageFromResource = async (resource: Response | string) => {

  if (typeof resource === `string`) return resource

  const contentType = resource.headers.get('Content-Type')

  if ([`image/jpg`, `image/jpeg`].some(mime => mime === contentType)) {
    const data = await getBase64FromBlob(await resource.blob())
    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, minimum-scale=0.1">
        </head>
        <body style="margin: 0px;" tabindex="-1">
          <img 
            src="${data}"
            style="width: 100%;height:100%;object-fit:contain;"
          >
        </body>
      </html>
        `
  }

  return await resource.text()
}

const getBase64FromBlob = (data: Blob) => {
  const reader = new FileReader();

  return new Promise<string>(resolve => {
    reader.addEventListener("load", function () {
      resolve(reader.result as string)
    }, false);

    reader.readAsDataURL(data)
  })
}
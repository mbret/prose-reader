import {
  type Observable,
  from,
  fromEvent,
  map,
  of,
  switchMap,
  take,
} from "rxjs"

export const getAttributeValueFromString = (string: string, key: string) => {
  const regExp = new RegExp(`${key}\\s*=\\s*([0-9.]+)`, `i`)
  const match = string.match(regExp) || []
  const firstMatch = match[1] || `0`

  return (match && Number.parseFloat(firstMatch)) || 0
}

export const injectCSS = (
  frameElement: HTMLIFrameElement,
  id: string,
  style: string,
  prepend?: boolean,
) => {
  if (!frameElement?.contentDocument?.head) return

  const userStyle = frameElement.contentDocument.createElement(`style`)
  userStyle.id = id
  userStyle.innerHTML = style

  if (prepend) {
    frameElement.contentDocument.head.prepend(userStyle)
  } else {
    frameElement.contentDocument.head.appendChild(userStyle)
  }
}

export const removeCSS = (frameElement: HTMLIFrameElement, id: string) => {
  if (frameElement?.contentDocument?.head) {
    const styleElement = frameElement.contentDocument.getElementById(id)

    if (styleElement) {
      styleElement.remove()
    }
  }
}

export const upsertCSSToFrame = (
  frameElement: HTMLIFrameElement | undefined,
  id: string,
  style: string,
  prepend?: boolean,
) => {
  if (!frameElement) return

  const existingElement = frameElement?.contentDocument?.getElementById(
    id,
  ) as HTMLStyleElement

  if (existingElement) {
    existingElement.innerHTML = style
    return
  }

  injectCSS(frameElement, id, style, prepend)
}

export const getFrameViewportInfo = (frame: HTMLIFrameElement | undefined) => {
  if (frame?.contentDocument) {
    const doc = frame.contentDocument
    const viewportMetaElement = doc.querySelector(`meta[name='viewport']`)

    if (viewportMetaElement) {
      const viewportContent = viewportMetaElement.getAttribute(`content`)

      if (viewportContent) {
        const width = getAttributeValueFromString(viewportContent, `width`)
        const height = getAttributeValueFromString(viewportContent, `height`)

        if (width > 0 && height > 0) {
          return {
            hasViewport: true,
            width: width,
            height: height,
          }
        }
        return { hasViewport: true }
      }
    }
  }

  return { hasViewport: false }
}

export const waitForFrameLoad = (stream: Observable<HTMLIFrameElement>) =>
  stream.pipe(
    switchMap((frame) => {
      if (
        frame.src === "about:blank" &&
        frame.contentDocument?.readyState === "complete" &&
        frame.contentDocument.body
      ) {
        return of(frame)
      }

      return fromEvent(frame, `load`).pipe(
        take(1),
        map(() => frame),
      )
    }),
  )

export const waitForFrameReady = (stream: Observable<HTMLIFrameElement>) =>
  stream.pipe(
    switchMap((frame) => {
      const readyPromise = frame?.contentDocument?.fonts.ready

      if (readyPromise) {
        return from(readyPromise).pipe(map(() => frame))
      }

      return of(undefined)
    }),
  )

import {
  from,
  fromEvent,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
  tap,
} from "rxjs"

export const getAttributeValueFromString = (string: string, key: string) => {
  const regExp = new RegExp(key + `\\s*=\\s*([0-9.]+)`, `i`)
  const match = string.match(regExp) || []
  const firstMatch = match[1] || `0`

  return (match && parseFloat(firstMatch)) || 0
}

export const injectCSS = (
  frameElement: HTMLIFrameElement,
  id: string,
  style: string,
  prepend?: boolean,
) => {
  if (
    frameElement &&
    frameElement.contentDocument &&
    frameElement.contentDocument.head
  ) {
    const userStyle = document.createElement(`style`)
    userStyle.id = id
    userStyle.innerHTML = style

    if (prepend) {
      frameElement.contentDocument.head.prepend(userStyle)
    } else {
      frameElement.contentDocument.head.appendChild(userStyle)
    }
  }
}

export const removeCSS = (frameElement: HTMLIFrameElement, id: string) => {
  if (
    frameElement &&
    frameElement.contentDocument &&
    frameElement.contentDocument.head
  ) {
    const styleElement = frameElement.contentDocument.getElementById(id)

    if (styleElement) {
      styleElement.remove()
    }
  }
}

export const upsertCSS = (
  frameElement: HTMLIFrameElement | undefined,
  id: string,
  style: string,
  prepend?: boolean,
) => {
  if (!frameElement) return

  removeCSS(frameElement, id)
  injectCSS(frameElement, id, style, prepend)
}

export const getFrameViewportInfo = (frame: HTMLIFrameElement | undefined) => {
  if (frame && frame?.contentDocument) {
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
        } else {
          return { hasViewport: true }
        }
      }
    }
  }

  return { hasViewport: false }
}

export const waitForFrameLoad = (stream: Observable<HTMLIFrameElement>) =>
  stream.pipe(
    switchMap((frame) =>
      fromEvent(frame, `load`).pipe(
        take(1),
        map(() => frame),
      ),
    ),
  )

export const waitForFrameReady = (stream: Observable<HTMLIFrameElement>) =>
  stream.pipe(
    switchMap((frame) =>
      from(frame?.contentDocument?.fonts.ready || of(undefined)).pipe(
        map(() => frame),
      ),
    ),
  )

import { Subject } from "rxjs"

export const createFingerTracker = () => {
  let fingerPositionInIframe: { x: number, y: number } | { x: undefined, y: undefined } = { x: undefined, y: undefined }
  const subject = new Subject<{ event: 'fingermove', data: { x: number, y: number } } | { event: 'fingerout', data: undefined }>()
  let isMouseDown = false

  const track = (frame: HTMLIFrameElement) => {
    fingerPositionInIframe.x = undefined
    fingerPositionInIframe.y = undefined

    frame.contentDocument?.addEventListener('mousedown', (e) => {
      isMouseDown = true
      fingerPositionInIframe.x = e.x
      fingerPositionInIframe.y = e.y
      subject.next({ event: 'fingermove', data: { x: e.x, y: e.y } })
    })

    frame.contentDocument?.addEventListener('mouseup', (e) => {
      isMouseDown = false
      fingerPositionInIframe.x = undefined
      fingerPositionInIframe.y = undefined
      subject.next({ event: 'fingerout', data: undefined })
    })

    frame.contentDocument?.addEventListener('mousemove', (e) => {
      if (isMouseDown) {
        subject.next({ event: 'fingermove', data: { x: e.x, y: e.y } })
      }
    })
  }

  return {
    track,
    getFingerPositionInIframe() {
      return (fingerPositionInIframe.x === undefined || fingerPositionInIframe.y === undefined) ? undefined : fingerPositionInIframe
    },
    destroy: () => {

    },
    $: subject.asObservable()
  }
}

export const createSelectionTracker = () => {
  let isSelecting = false
  let frame: HTMLIFrameElement | undefined
  const subject = new Subject<
    { event: 'selectionchange', data: Selection | null }
    | { event: 'selectstart', data: Selection | null }
    | { event: 'selectend', data: Selection | null }
  >()
  const mouseUpEvents = [
    'mouseup' as const,
    "pointerup" as const
  ]

  const track = (frameToTrack: HTMLIFrameElement) => {
    frame = frameToTrack

    mouseUpEvents.forEach(eventName => {
      frameToTrack.contentWindow?.addEventListener(eventName, (e) => {
        isSelecting = false
        // console.log(`${eventName} selectend`, frame?.contentWindow?.getSelection(), frame?.contentWindow?.getSelection()?.toString())
        // subject.next({ event: 'selectend', data: frame?.contentWindow?.getSelection() || null })
      })
    })

    frameToTrack.contentDocument?.addEventListener('selectionchange', e => {
      subject.next({ event: 'selectionchange', data: frame?.contentWindow?.getSelection() || null })
    })

    frameToTrack.contentWindow?.addEventListener('selectstart', e => {
      isSelecting = true
      // console.log(`selectstart`, e)
      // subject.next({ event: 'selectstart', data: frame?.contentWindow?.getSelection() || null })
    })
  }

  const destroy = () => {

  }

  return {
    track,
    destroy,
    isSelecting: () => isSelecting,
    getSelection: () => {
      const selection = frame?.contentWindow?.getSelection()
      if (!selection?.anchorNode || selection.type === 'None' || selection.type === 'Caret') return undefined

      return selection
    },
    $: subject.asObservable(),
  }
}
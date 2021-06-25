import { createReader } from '@oboku/reader'
import { tap } from 'rxjs/operators'
import { NUMBER_OF_ADJACENT_SPINE_ITEM_TO_PRELOAD } from './constants'
import { createGestureHandler } from './gestures'
import { messagesDown$ } from './messages'
import { MessageDown } from './types/shared'

window.__OBOKU_READER_DEBUG = true

window.postDownMessage = (message: MessageDown) => {
  messagesDown$.next(message)
}

const reader = createReader({
  containerElement: document.getElementById('app') || document.body,
  pageTurnAnimation: 'slide',
})

const manifest = window.MANIFEST

reader.load(manifest, {
  numberOfAdjacentSpineItemToPreLoad: NUMBER_OF_ADJACENT_SPINE_ITEM_TO_PRELOAD,
})

createGestureHandler(reader)

messagesDown$
  .pipe(
    tap(event => {
      if (event.event === 'goTo') {
        reader.goTo(event.data)
      }
    })
  )
  .subscribe()

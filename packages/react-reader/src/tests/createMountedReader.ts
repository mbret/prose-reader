import { createReader, type Manifest, type Reader } from "@prose-reader/core"
import {
  type EnhancerAPI as GesturesEnhancerAPI,
  gesturesEnhancer,
} from "@prose-reader/enhancer-gestures"
import { NEVER } from "rxjs"
import { onTestFinished } from "vitest"

const ONE_PAGE_MANIFEST: Manifest = {
  filename: `comic`,
  mediaType: `application/epub+zip`,
  title: `comic`,
  renditionLayout: `pre-paginated`,
  renditionSpread: undefined,
  readingDirection: `ltr`,
  spineItems: [
    {
      id: `page-1`,
      href: `/page_1.jpg`,
      containerUri: `page_1.jpg`,
      index: 0,
      renditionLayout: `pre-paginated`,
      progressionWeight: 0,
    },
  ],
  items: [],
}

const createAppReader = gesturesEnhancer(createReader)

/**
 * A one-page reader with the gestures enhancer, mounted in an element of the
 * document. It is destroyed when the test finishes.
 */
export const createMountedReader = (): Reader & GesturesEnhancerAPI => {
  const readerElement = document.createElement(`div`)
  document.body.appendChild(readerElement)
  const reader = createAppReader({
    manifest: ONE_PAGE_MANIFEST,
    getResource: () => NEVER,
  })

  reader.mount(readerElement)
  onTestFinished(function destroyReader() {
    reader.destroy()
    readerElement.remove()
  })

  return reader
}

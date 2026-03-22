import { DocumentRenderer } from "@prose-reader/core"
import { EMPTY, of } from "rxjs"

export class AudioRenderer extends DocumentRenderer {
  onCreateDocument() {
    const ownerDocument = this.containerElement.ownerDocument
    const rootElement = ownerDocument.createElement(`div`)

    rootElement.style.cssText = `
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      display: block;
    `
    rootElement.setAttribute(`data-prose-reader-audio-page`, this.item.id)

    this.setDocumentContainer(rootElement)

    return of(rootElement)
  }

  onLoadDocument() {
    this.attach()

    return EMPTY
  }

  onUnload() {
    this.detach()

    return EMPTY
  }

  onLayout() {
    const { width, height } = this.viewport.pageSize
    const rootElement = this.documentContainer

    if (rootElement) {
      rootElement.style.width = `${width}px`
      rootElement.style.height = `${height}px`
    }

    return of({ width, height })
  }

  onRenderHeadless() {
    return EMPTY
  }

  getDocumentFrame() {
    return undefined
  }

  get renditionLayout(): `pre-paginated` {
    return `pre-paginated`
  }
}

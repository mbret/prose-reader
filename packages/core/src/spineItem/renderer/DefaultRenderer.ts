import { EMPTY, of } from "rxjs"
import { DocumentRenderer } from "./DocumentRenderer"

export class DefaultRenderer extends DocumentRenderer {
  onUnload() {
    return EMPTY
  }

  onCreateDocument() {
    return of(document.createElement("div"))
  }

  onLoadDocument() {
    return EMPTY
  }

  onLayout() {
    return of(undefined)
  }

  onRenderHeadless() {
    return EMPTY
  }

  getDocumentFrame() {
    return undefined
  }
}

import { EMPTY, Observable, of } from "rxjs"
import { DocumentRenderer } from "./DocumentRenderer"

export class DefaultRenderer extends DocumentRenderer {
  onUnload(): Observable<unknown> {
    return EMPTY
  }

  onCreateDocument(): Observable<unknown> {
    return EMPTY
  }

  onLoadDocument(): Observable<unknown> {
    return EMPTY
  }

  onLayout() {
    return of(undefined)
  }

  onRenderHeadless() {
    return EMPTY
  }
}

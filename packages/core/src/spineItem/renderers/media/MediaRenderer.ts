import { from, fromEvent, merge, switchMap, takeUntil, tap } from "rxjs"
import { Renderer } from "../Renderer"
import { Context } from "../../../context/Context"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { HookManager } from "../../../hooks/HookManager"
import { Manifest } from "@prose-reader/shared"
import { ResourceHandler } from "../../ResourceHandler"

export class MediaRenderer extends Renderer {
  constructor(
    context: Context,
    settings: ReaderSettingsManager,
    hookManager: HookManager,
    item: Manifest[`spineItems`][number],
    containerElement: HTMLElement,
    resourcesHandler: ResourceHandler,
  ) {
    super(
      context,
      settings,
      hookManager,
      item,
      containerElement,
      resourcesHandler,
    )

    this.load$
      .pipe(
        switchMap(() => {
          this.stateSubject.next(`loading`)

          return from(resourcesHandler.getResource()).pipe(
            switchMap((responseOrUrl) => {
              const imgElement =
                containerElement.ownerDocument.createElement(`img`)

              this.layers = [{ element: imgElement }]

              this.hookManager.execute(
                `item.onDocumentCreated`,
                undefined,
                { itemId: item.id, layers: this.layers },
              )

              containerElement.appendChild(imgElement)

              if (responseOrUrl instanceof URL) {
                imgElement.src = responseOrUrl.href
              }

              return fromEvent(imgElement, `load`)
            }),
            tap(() => {
              this.stateSubject.next(`loaded`)
              this.stateSubject.next(`ready`)
            }),
            takeUntil(merge(this.unload$, this.destroy$)),
          )
        }),
      )
      .subscribe()

    merge(this.unload$, this.destroy$)
      .pipe(
        tap(() => {
          this.stateSubject.next(`unloading`)

          this.layers.forEach(({ element }) => {
            element.remove()
          })

          this.layers = []

          this.stateSubject.next(`idle`)
        }),
      )
      .subscribe()

    this.destroy$.subscribe(() => {})

    this.state$.subscribe((state) => {
      console.log(`FOOO`, `state`, item.id, state)
    })
  }

  render(params: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }) {
    console.log(`FOOO`, `render`)

    return {
      width: 0,
      height: 0,
    }
  }

  get writingMode() {
    return undefined
  }

  get readingDirection() {
    return undefined
  }
}

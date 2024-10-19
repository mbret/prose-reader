import { Manifest } from "@prose-reader/shared"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { Observable } from "rxjs"

type Layer = {
  element: Element
}

export abstract class Renderer {
  constructor(
    protected context: Context,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
    protected item: Manifest[`spineItems`][number],
    protected containerElement: HTMLElement,
  ) {}

  abstract render(params: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }): { width: number; height: number }

  /**
   * Detect the type of resource (independently of rendition flow).
   * If an image is detected for reflowable for example we may want to display
   * things accordingly.
   */
  abstract isImageType(): boolean

  abstract load(): void
  abstract unload(): void

  abstract getViewPortInformation():
    | {
        computedScale: number
        computedWidthScale: number
        viewportDimensions: {
          width: number
          height: number
        }
      }
    | undefined

  abstract destroy(): void

  abstract upsertCSS(id: string, style: string, prepend?: boolean): void

  abstract get writingMode(): `vertical-rl` | `horizontal-tb` | undefined
  abstract get readingDirection(): `rtl` | `ltr` | undefined

  abstract get isReady(): boolean

  abstract get loaded$(): Observable<Element>

  abstract get isReady$(): Observable<boolean>

  abstract get ready$(): Observable<unknown>

  abstract get unloaded$(): Observable<unknown>

  abstract get layers(): Layer[]
}

import { Manifest } from "../../.."
import { Context } from "../../../context/Context"
import { getAttributeValueFromString } from "../../../utils/frames"
import { createHtmlPageFromResource } from "./createHtmlPageFromResource"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { type HookManager } from "../../../hooks/HookManager"
import { DestroyableClass } from "../../../utils/DestroyableClass"
import { createLoader } from "./loader/loader"

export class FrameItem extends DestroyableClass {
  protected loader: ReturnType<typeof createLoader>



  constructor(
    protected parent: HTMLElement,
    protected item: Manifest[`spineItems`][number],
    protected context: Context,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
  ) {
    super()

    this.loader = createLoader({
      context,
      hookManager,
      item,
      parent,
      settings,
    })
  }

  // @todo optimize
  public getComputedStyleAfterLoad() {
    const frame = this.loader.element
    const body = frame?.contentDocument?.body

    if (body) {
      return frame?.contentWindow?.getComputedStyle(body)
    }
  }

  // @todo memoize
  public getViewportDimensions = () => {
    const frame = this.loader.element

    if (frame && frame?.contentDocument) {
      const doc = frame.contentDocument
      const viewPortMeta = doc.querySelector(`meta[name='viewport']`)
      if (viewPortMeta) {
        const viewPortMetaInfos = viewPortMeta.getAttribute(`content`)
        if (viewPortMetaInfos) {
          const width = getAttributeValueFromString(viewPortMetaInfos, `width`)
          const height = getAttributeValueFromString(
            viewPortMetaInfos,
            `height`,
          )
          if (width > 0 && height > 0) {
            return {
              width: width,
              height: height,
            }
          } else {
            return undefined
          }
        }
      }
    }

    return undefined
  }

  public getWritingMode = () => {
    return this.getComputedStyleAfterLoad()?.writingMode as
      | `vertical-rl`
      | `horizontal-tb`
      | undefined
  }

  public isUsingVerticalWriting = () => {
    return !!this.getWritingMode()?.startsWith(`vertical`)
  }

  public getHtmlFromResource = (response: Response) => {
    return createHtmlPageFromResource(response, this.item)
  }

  public get element() {
    return this.loader.element
  }

  public get unloaded$() {
    return this.loader.unloaded$
  }

  public get loaded$() {
    return this.loader.loaded$
  }

  public get ready$() {
    return this.loader.ready$
  }

  public get isReady$() {
    return this.loader.isReady$
  }

  public get isLoaded() {
    return this.loader.state === "loaded" || this.loader.state === "ready"
  }

  public get isReady() {
    return this.loader.state === "ready"
  }

  public load() {
    this.loader.load()
  }

  public unload() {
    this.loader.unload()
  }

  /**
   * Upward layout is used when the parent wants to manipulate the iframe without triggering
   * `layout` event. This is a particular case needed for iframe because the parent can layout following
   * an iframe `layout` event. Because the parent `layout` may change some of iframe properties we do not
   * want the iframe to trigger a new `layout` even and have infinite loop.
   */
  public staticLayout = (size: { width: number; height: number }) => {
    const frame = this.loader.element
    if (frame) {
      frame.style.width = `${size.width}px`
      frame.style.height = `${size.height}px`

      if (this.settings.values.computedPageTurnMode !== `scrollable`) {
        // @todo see what's the impact
        frame.setAttribute(`tab-index`, `0`)
      }
    }
  }

  public destroy = () => {
    super.destroy()

    this.loader.destroy()
  }
}

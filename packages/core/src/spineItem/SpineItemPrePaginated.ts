import { Context } from "../context/Context"
import { Manifest } from ".."
import { SpineItem } from "./SpineItem"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"

export class SpineItemPrePaginated extends SpineItem {
  constructor(
    item: Manifest[`spineItems`][number],
    containerElement: HTMLElement,
    context: Context,
    settings: ReaderSettingsManager,
    hookManager: HookManager,
    index: number,
  ) {
    super(item, containerElement, context, settings, hookManager, index)
  }

  layout = ({
    blankPagePosition,
    minimumWidth,
    spreadPosition,
  }: {
    blankPagePosition: `before` | `after` | `none`
    minimumWidth: number
    spreadPosition: `none` | `left` | `right`
  }) => {
    const { width, height } = this.renderer.render({
      blankPagePosition,
      minPageSpread: minimumWidth / this.context.getPageSize().width,
      spreadPosition,
    })

    this.executeOnLayoutBeforeMeasurementHook({ minimumWidth: height })

    this._layout({
      width,
      height,
      blankPagePosition,
      minimumWidth,
    })

    return { width, height }
  }
}

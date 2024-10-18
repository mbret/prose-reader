import { Context } from "../context/Context"
import { Manifest } from ".."
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { SpineItemPrePaginated } from "./SpineItemPrePaginated"
import { SpineItemReflowable } from "./SpineItemReflowable"

export const createSpineItem = ({
  item,
  context,
  containerElement,
  settings,
  hookManager,
  index,
}: {
  item: Manifest[`spineItems`][number]
  containerElement: HTMLElement
  context: Context
  settings: ReaderSettingsManager
  hookManager: HookManager
  index: number
}) => {
  if (item.renditionLayout === `pre-paginated`) {
    return new SpineItemPrePaginated(
      item,
      containerElement,
      context,
      settings,
      hookManager,
      index,
    )
  }

  return new SpineItemReflowable(
    item,
    containerElement,
    context,
    settings,
    hookManager,
    index,
  )
}

export type SpineItem = ReturnType<typeof createSpineItem>

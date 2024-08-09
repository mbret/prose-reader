import { Context } from "../context/Context"
import { Manifest } from ".."
import { createPrePaginatedSpineItem } from "./prePaginatedSpineItem"
import { createReflowableSpineItem } from "./reflowable/ReflowableSpineItems"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"

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
    return createPrePaginatedSpineItem({
      item,
      context,
      containerElement,
      settings,
      hookManager,
      index,
    })
  }

  return createReflowableSpineItem({
    item,
    context,
    containerElement,
    settings,
    hookManager,
    index,
  })
}

export type SpineItem = ReturnType<typeof createSpineItem>

import { BehaviorSubject, Observable } from "rxjs"
import { Context } from "../context/Context"
import { Manifest } from "../types"
import { Hook } from "../types/Hook"
import { createPrePaginatedSpineItem } from "./prePaginatedSpineItem"
import { createReflowableSpineItem } from "./reflowableSpineItem"
import { SettingsManager } from "../settings/SettingsManager"
import { HookManager } from "../hooks/HookManager"

export const createSpineItem = ({
  item,
  context,
  containerElement,
  hooks$,
  viewportState$,
  settings,
  hookManager
}: {
  item: Manifest[`spineItems`][number]
  containerElement: HTMLElement
  context: Context
  hooks$: BehaviorSubject<Hook[]>
  viewportState$: Observable<`free` | `busy`>
  settings: SettingsManager
  hookManager: HookManager
}) => {
  if (item.renditionLayout === `pre-paginated`) {
    return createPrePaginatedSpineItem({
      item,
      context,
      containerElement,
      hooks$,
      viewportState$,
      settings,
      hookManager
    })
  }

  return createReflowableSpineItem({
    item,
    context,
    containerElement,
    hooks$,
    viewportState$,
    settings,
    hookManager
  })
}

export type SpineItem = ReturnType<typeof createSpineItem>

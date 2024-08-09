import { of, tap } from "rxjs"
import { HookManager, Manifest } from "../../.."
import { Context } from "../../../context/Context"
import { waitForSwitch } from "../../../utils/rxjs"

export const unloadFrame = ({
  item,
  hookManager,
  frameElement,
  context,
}: {
  item: Manifest[`spineItems`][number]
  hookManager: HookManager
  frameElement?: HTMLIFrameElement
  context: Context
}) => {
  return of(null).pipe(
    waitForSwitch(context.bridgeEvent.viewportFree$),
    tap(() => {
      hookManager.destroy(`item.onLoad`, item.id)

      frameElement?.remove()
    }),
  )
}

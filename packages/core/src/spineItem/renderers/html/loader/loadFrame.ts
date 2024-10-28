import { of, tap } from "rxjs"
import { attachFrameSrc } from "./attachFrameSrc"
import { configureFrame } from "./configureFrame"
import { createFrameElement } from "./createFrameElement"
import { waitForFrameLoad } from "./waitForFrameLoad"
import { ReaderSettingsManager } from "../../../../settings/ReaderSettingsManager"
import { Manifest } from "@prose-reader/shared"
import { HookManager } from "../../../../hooks/HookManager"
import { Context } from "../../../../context/Context"
import { waitForSwitch } from "../../../../utils/rxjs"
import { ResourceHandler } from "../../../ResourceHandler"

export const loadFrame = ({
  settings,
  item,
  hookManager,
  element,
  onFrameElement,
  context,
  resourcesHandler,
}: {
  settings: ReaderSettingsManager
  item: Manifest[`spineItems`][number]
  hookManager: HookManager
  element: HTMLElement
  onFrameElement: (element: HTMLIFrameElement) => void
  context: Context
  resourcesHandler: ResourceHandler
}) => {
  const frameElement = createFrameElement()

  return of(frameElement).pipe(
    tap((frame) => {
      element.appendChild(frame)

      onFrameElement(frame)
    }),
    attachFrameSrc({ settings, item, resourcesHandler }),
    waitForSwitch(context.bridgeEvent.viewportFree$),
    waitForFrameLoad,
    waitForSwitch(context.bridgeEvent.viewportFree$),
    configureFrame({
      item,
      settings,
      hookManager,
    }),
  )
}

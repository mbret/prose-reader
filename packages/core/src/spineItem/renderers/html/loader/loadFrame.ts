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

export const loadFrame = ({
  settings,
  item,
  hookManager,
  element,
  onFrameElement,
  context,
}: {
  settings: ReaderSettingsManager
  item: Manifest[`spineItems`][number]
  hookManager: HookManager
  element: HTMLElement
  onFrameElement: (element: HTMLIFrameElement) => void
  context: Context
}) => {
  const frameElement = createFrameElement()

  return of(frameElement).pipe(
    tap((frame) => {
      element.appendChild(frame)

      onFrameElement(frame)
    }),
    attachFrameSrc({ settings, item }),
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

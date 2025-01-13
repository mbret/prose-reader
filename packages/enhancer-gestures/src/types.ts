import { Observable, ObservedValueOf } from "rxjs"
import {
  PanEvent,
  PanRecognizer,
  PinchEvent,
  PinchRecognizer,
  Recognizable,
  SwipeEvent,
  SwipeRecognizer,
  TapRecognizer,
  type TapEvent,
} from "gesturx"
import { HookManager } from "../../core/dist/hooks/HookManager"
import { GesturesSettingsManager } from "./SettingsManager"

export type Hook = {
  name: "beforeGesture"
  runFn: (params: { event$: Observable<GestureEvent> }) => Observable<boolean>
}

export type GestureRecognizable = Recognizable<
  (TapRecognizer | PanRecognizer | SwipeRecognizer | PinchRecognizer)[]
>

export type GestureEvent = ObservedValueOf<GestureRecognizable["events$"]>

export type InputSettings = {
  panNavigation: "pan" | "swipe" | false
  fontScalePinchEnabled: boolean
  fontScaleMaxScale: number
  fontScaleMinScale: number
  // @todo default value
  // @todo font scale max / min
  // @todo cancel pan if selecting
  fontScalePinchThrottleTime: number
  pinchCancelPan: boolean
  ignore: string[]
}

export type OutputSettings = InputSettings

export type EnhancerAPI = {
  gestures: {
    settings: GesturesSettingsManager
    hooks: HookManager<Hook>
    gestures$: Observable<{
      event: TapEvent | PanEvent | SwipeEvent | PinchEvent
      handled: boolean
    }>
  }
}

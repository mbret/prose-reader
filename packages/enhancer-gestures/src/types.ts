import { Observable, ObservedValueOf } from "rxjs"
import { PanRecognizer, PinchRecognizer, Recognizable, SwipeRecognizer, TapRecognizer, type TapEvent } from "gesturx"
import { HookManager } from "../../core/dist/hooks/HookManager"
import { GesturesSettingsManager } from "./SettingsManager"

export type Hook = {
  name: "beforeTap"
  runFn: (params: { event: TapEvent }) => Observable<boolean>
}

export type GestureRecognizable = Recognizable<(TapRecognizer | PanRecognizer | SwipeRecognizer | PinchRecognizer)[]>

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
}

export type OutputSettings = InputSettings

export type EnhancerAPI = {
  gestures: {
    settings: GesturesSettingsManager
    unhandledEvent$: Observable<GestureEvent>
    hookManager: HookManager<Hook>
  }
}

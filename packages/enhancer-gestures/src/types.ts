import { Observable, ObservedValueOf } from "rxjs"
import { PanRecognizer, PinchRecognizer, Recognizable, SwipeRecognizer, TapRecognizer, type TapEvent } from "gesturx"
import { HookManager } from "../../core/dist/hooks/HookManager"
import { GesturesSettingsManager } from "./SettingsManager"

export type Hook = {
  name: "beforeTap"
  runFn: (params: { event: TapEvent }) => boolean
}

export type GestureRecognizable = Recognizable<(TapRecognizer | PanRecognizer | SwipeRecognizer | PinchRecognizer)[]>

export type GestureEvent = ObservedValueOf<GestureRecognizable["events$"]>

export type InputSettings = {
  panNavigation: "pan" | "swipe" | false
  fontScalePinchEnabled: boolean
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

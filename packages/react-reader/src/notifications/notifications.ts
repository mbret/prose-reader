import { signal } from "reactjrx"
import type { Observable } from "rxjs"

export const notificationsSignal = signal<
  | {
      key?: string
      title: string
      description?: string
      duration?: number
      abort?: Observable<unknown>
    }
  | undefined
>({
  default: undefined,
})

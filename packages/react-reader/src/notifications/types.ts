import type { Observable } from "rxjs"

export type ReaderNotification = {
  key: string
  title: string
  description?: string
  duration?: number
  abort?: Observable<unknown>
}

import { signal } from "reactjrx"

export const notificationsSignal = signal<
  | {
      key: string
      title: string
      description: string
    }
  | undefined
>({
  default: undefined,
})

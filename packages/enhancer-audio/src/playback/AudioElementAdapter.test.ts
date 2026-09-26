/* @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest"
import { AudioElementAdapter } from "./AudioElementAdapter"

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

type PlayRequestNotification = `next` | `complete` | { error: unknown }

const recordPlayRequestNotifications = (adapter: AudioElementAdapter) => {
  const notifications: PlayRequestNotification[] = []

  adapter.play$().subscribe({
    next: () => notifications.push(`next`),
    complete: () => notifications.push(`complete`),
    error: (error: unknown) => notifications.push({ error }),
  })

  return notifications
}

describe(`AudioElementAdapter`, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([`NotSupportedError`, `NotAllowedError`])(
    `fails a play request the element rejects with %s without waiting for canplay`,
    async (rejectionName) => {
      const adapter = new AudioElementAdapter()
      const rejection = new DOMException(``, rejectionName)
      const playSpy = vi
        .spyOn(adapter.element, `play`)
        .mockRejectedValue(rejection)

      const notifications = recordPlayRequestNotifications(adapter)

      await flush()

      expect(notifications).toEqual([{ error: rejection }])
      expect(playSpy).toHaveBeenCalledTimes(1)
    },
  )

  it(`completes a play request that a pause or a load interrupted, without replaying it on canplay`, async () => {
    const adapter = new AudioElementAdapter()
    const playSpy = vi
      .spyOn(adapter.element, `play`)
      .mockRejectedValue(new DOMException(``, `AbortError`))

    const notifications = recordPlayRequestNotifications(adapter)

    await flush()

    expect(notifications).toEqual([`complete`])

    adapter.element.dispatchEvent(new Event(`canplay`))
    await flush()

    expect(playSpy).toHaveBeenCalledTimes(1)
  })
})

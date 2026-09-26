/* @vitest-environment happy-dom */

import { lastValueFrom } from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AudioElementAdapter } from "./AudioElementAdapter"

describe(`AudioElementAdapter`, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it(`retries a rejected play only once the element emits canplay`, async () => {
    const audio = new AudioElementAdapter()
    const firstPlayAttempt = Promise.withResolvers<void>()
    const playSpy = vi
      .spyOn(audio.element, `play`)
      .mockReturnValueOnce(firstPlayAttempt.promise)
      .mockResolvedValueOnce(undefined)

    const playback = lastValueFrom(audio.play$())

    expect(playSpy).toHaveBeenCalledTimes(1)

    firstPlayAttempt.reject(new DOMException(``, `AbortError`))
    await firstPlayAttempt.promise.catch(() => undefined)

    expect(playSpy).toHaveBeenCalledTimes(1)

    audio.element.dispatchEvent(new Event(`canplay`))

    expect(playSpy).toHaveBeenCalledTimes(2)
    await expect(playback).resolves.toBeUndefined()
  })
})
